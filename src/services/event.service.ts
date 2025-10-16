import Event, { IEvent, ITicketType } from '../models/Event';
import User from '../models/User';
import redisClient from '../config/redis';
import logger from '../utils/logger';
import mongoose from 'mongoose';

export interface CreateEventData {
  organizerId: string;
  organizationName: string;
  title: string;
  description: string;
  category: string;
  poster: string;
  gallery?: string[];
  venue: {
    type: 'offline' | 'online' | 'hybrid';
    name?: string;
    building?: string;
    room?: string;
    address?: string;
    city?: string;
    coordinates?: { lat: number; lng: number };
    mapLink?: string;
    onlineLink?: string;
  };
  schedule: {
    start: Date;
    end: Date;
    registrationOpen: Date;
    registrationClose: Date;
    timezone?: string;
  };
  ticketTypes: Array<{
    name: string;
    price: number;
    quota: number;
    description?: string;
    benefits: string[];
    salesStart: Date;
    salesEnd: Date;
  }>;
  requirements?: string[];
  terms?: string;
  faq?: Array<{ question: string; answer: string }>;
  contactPerson: {
    name: string;
    phone: string;
    email: string;
    line?: string;
    instagram?: string;
    whatsapp?: string;
  };
  tags?: string[];
  visibility?: 'public' | 'private' | 'unlisted';
}

export interface UpdateEventData extends Partial<CreateEventData> {}

export interface EventFilters {
  category?: string;
  search?: string;
  city?: string;
  startDate?: Date;
  endDate?: Date;
  minPrice?: number;
  maxPrice?: number;
  venueType?: 'offline' | 'online' | 'hybrid';
  sortBy?: 'date' | 'price' | 'popular' | 'newest';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  status?: string;
  featured?: boolean;
  organizerId?: string;
}

class EventService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'event:';

  /**
   * Create new event
   */
  async createEvent(data: CreateEventData): Promise<IEvent> {
    try {
      // Verify organizer exists and has correct role
      const organizer = await User.findById(data.organizerId);
      if (!organizer) {
        throw new Error('Organizer tidak ditemukan');
      }

      if (organizer.role !== 'organization' && organizer.role !== 'admin') {
        throw new Error('Hanya organisasi yang dapat membuat event');
      }

      if (organizer.role === 'organization' && organizer.organization?.verificationStatus !== 'verified') {
        throw new Error('Organisasi belum diverifikasi');
      }

      // Create event
      const event = await Event.create({
        ...data,
        status: 'draft',
        approval: {
          status: 'pending',
        },
        stats: {
          totalQuota: 0,
          totalSold: 0,
          totalRevenue: 0,
          viewCount: 0,
          shareCount: 0,
          favoriteCount: 0,
        },
      });

      logger.info(`Event created: ${event.title} by ${data.organizationName}`);

      // Clear cache
      await this.clearEventCache();

      return event;
    } catch (error: any) {
      logger.error('Create event error:', error);
      throw error;
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string, incrementView: boolean = false): Promise<IEvent | null> {
    try {
      // Try cache first
      const cacheKey = `${this.CACHE_PREFIX}${eventId}`;
      const cached = await redisClient.get<IEvent>(cacheKey);
      if (cached) {
        if (incrementView) {
          await this.incrementViewCount(eventId);
        }
        return cached;
      }

      const event = await Event.findById(eventId)
        .populate('organizerId', 'profile.fullName email')
        .lean();

      if (!event) {
        return null;
      }

      // Cache the event
      await redisClient.set(cacheKey, event, this.CACHE_TTL);

      // Increment view count if requested
      if (incrementView) {
        await this.incrementViewCount(eventId);
      }

      return event as unknown as IEvent;
    } catch (error: any) {
      logger.error('Get event by ID error:', error);
      throw error;
    }
  }

  /**
   * Get event by slug
   */
  async getEventBySlug(slug: string, incrementView: boolean = false): Promise<IEvent | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}slug:${slug}`;
      const cached = await redisClient.get<IEvent>(cacheKey);
      if (cached) {
        if (incrementView) {
          await this.incrementViewCount(cached._id.toString());
        }
        return cached;
      }

      const event = await Event.findOne({ slug })
        .populate('organizerId', 'profile.fullName email organization.name')
        .lean();

      if (!event) {
        return null;
      }

      await redisClient.set(cacheKey, event, this.CACHE_TTL);

      if (incrementView) {
        await this.incrementViewCount(event._id.toString());
      }

      return event as unknown as IEvent;
    } catch (error: any) {
      logger.error('Get event by slug error:', error);
      throw error;
    }
  }

  /**
   * Get events with filters and pagination
   */
  async getEvents(filters: EventFilters): Promise<{ events: IEvent[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        category,
        search,
        city,
        startDate,
        endDate,
        minPrice,
        maxPrice,
        venueType,
        sortBy = 'date',
        sortOrder = 'asc',
        page = 1,
        limit = 10,
        status,
        featured,
        organizerId,
      } = filters;

      // Build query
      const query: any = {};

      // Default: only show published events for public
      if (!status) {
        query.status = 'published';
        query.visibility = 'public';
      } else if (status) {
        query.status = status;
      }

      if (category) query.category = category;
      if (city) query['venue.city'] = new RegExp(city, 'i');
      if (venueType) query['venue.type'] = venueType;
      if (featured !== undefined) query.featured = featured;
      if (organizerId) query.organizerId = organizerId;

      // Date filters
      if (startDate || endDate) {
        query['schedule.start'] = {};
        if (startDate) query['schedule.start'].$gte = startDate;
        if (endDate) query['schedule.start'].$lte = endDate;
      }

      // Price filters (check minimum price in ticket types)
      if (minPrice !== undefined || maxPrice !== undefined) {
        query['ticketTypes.price'] = {};
        if (minPrice !== undefined) query['ticketTypes.price'].$gte = minPrice;
        if (maxPrice !== undefined) query['ticketTypes.price'].$lte = maxPrice;
      }

      // Text search
      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
          { tags: new RegExp(search, 'i') },
          { organizationName: new RegExp(search, 'i') },
        ];
      }

      // Sorting
      let sort: any = {};
      switch (sortBy) {
        case 'date':
          sort['schedule.start'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'price':
          sort['ticketTypes.0.price'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'popular':
          sort['stats.viewCount'] = -1;
          break;
        case 'newest':
          sort.createdAt = -1;
          break;
        default:
          sort['schedule.start'] = 1;
      }

      // Pagination
      const skip = (page - 1) * limit;

      // Execute query
      const [events, total] = await Promise.all([
        Event.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('organizerId', 'profile.fullName organization.name')
          .lean(),
        Event.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        events: events as unknown as IEvent[],
        total,
        page,
        totalPages,
      };
    } catch (error: any) {
      logger.error('Get events error:', error);
      throw error;
    }
  }

  /**
   * Update event
   */
  async updateEvent(eventId: string, userId: string, data: UpdateEventData): Promise<IEvent> {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      // Check ownership or admin
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User tidak ditemukan');
      }

      const isOwner = event.organizerId.toString() === userId;
      const isAdmin = user.role === 'admin';

      if (!isOwner && !isAdmin) {
        throw new Error('Anda tidak memiliki akses untuk mengubah event ini');
      }

      // Cannot update if event is ongoing or completed
      if (['ongoing', 'completed'].includes(event.status)) {
        throw new Error('Event yang sedang berlangsung atau selesai tidak dapat diubah');
      }

      // Update fields
      Object.assign(event, data);

      // If major changes, reset approval status
      if (data.title || data.description || data.schedule || data.ticketTypes) {
        if (event.status === 'published') {
          event.status = 'pending_approval';
          event.approval.status = 'pending';
        }
      }

      await event.save();

      // Clear cache
      await this.clearEventCache();
      await redisClient.del(`${this.CACHE_PREFIX}${eventId}`);
      await redisClient.del(`${this.CACHE_PREFIX}slug:${event.slug}`);

      logger.info(`Event updated: ${event.title}`);

      return event;
    } catch (error: any) {
      logger.error('Update event error:', error);
      throw error;
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId: string, userId: string): Promise<void> {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User tidak ditemukan');
      }

      const isOwner = event.organizerId.toString() === userId;
      const isAdmin = user.role === 'admin';

      if (!isOwner && !isAdmin) {
        throw new Error('Anda tidak memiliki akses untuk menghapus event ini');
      }

      // Cannot delete if has registrations
      if (event.stats.totalSold > 0) {
        throw new Error('Event dengan pendaftar tidak dapat dihapus. Silakan batalkan event.');
      }

      await Event.findByIdAndDelete(eventId);

      // Clear cache
      await this.clearEventCache();
      await redisClient.del(`${this.CACHE_PREFIX}${eventId}`);
      await redisClient.del(`${this.CACHE_PREFIX}slug:${event.slug}`);

      logger.info(`Event deleted: ${event.title}`);
    } catch (error: any) {
      logger.error('Delete event error:', error);
      throw error;
    }
  }

  /**
   * Submit event for approval
   */
  async submitForApproval(eventId: string, userId: string): Promise<IEvent> {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      if (event.organizerId.toString() !== userId) {
        throw new Error('Anda tidak memiliki akses untuk submit event ini');
      }

      if (event.status !== 'draft') {
        throw new Error('Hanya event draft yang dapat disubmit untuk approval');
      }

      event.status = 'pending_approval';
      event.approval.status = 'pending';
      await event.save();

      // Clear cache
      await this.clearEventCache();

      logger.info(`Event submitted for approval: ${event.title}`);

      return event;
    } catch (error: any) {
      logger.error('Submit for approval error:', error);
      throw error;
    }
  }

  /**
   * Approve event (Admin only)
   */
  async approveEvent(eventId: string, adminId: string, notes?: string): Promise<IEvent> {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      if (event.approval.status !== 'pending') {
        throw new Error('Event bukan dalam status pending approval');
      }

      event.status = 'approved';
      event.approval.status = 'approved';
      event.approval.approvedBy = new mongoose.Types.ObjectId(adminId);
      event.approval.approvedAt = new Date();
      event.approval.adminNotes = notes;

      await event.save();

      // Clear cache
      await this.clearEventCache();

      logger.info(`Event approved: ${event.title} by admin ${adminId}`);

      return event;
    } catch (error: any) {
      logger.error('Approve event error:', error);
      throw error;
    }
  }

  /**
   * Reject event (Admin only)
   */
  async rejectEvent(eventId: string, adminId: string, reason: string): Promise<IEvent> {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      event.status = 'rejected';
      event.approval.status = 'rejected';
      event.approval.approvedBy = new mongoose.Types.ObjectId(adminId);
      event.approval.approvedAt = new Date();
      event.approval.rejectionReason = reason;

      await event.save();

      // Clear cache
      await this.clearEventCache();

      logger.info(`Event rejected: ${event.title} by admin ${adminId}`);

      return event;
    } catch (error: any) {
      logger.error('Reject event error:', error);
      throw error;
    }
  }

  /**
   * Publish event
   */
  async publishEvent(eventId: string, userId: string): Promise<IEvent> {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      const user = await User.findById(userId);
      const isOwner = event.organizerId.toString() === userId;
      const isAdmin = user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        throw new Error('Akses tidak diizinkan');
      }

      if (event.status !== 'approved') {
        throw new Error('Event harus diapprove terlebih dahulu');
      }

      event.status = 'published';
      event.publishedAt = new Date();
      await event.save();

      // Clear cache
      await this.clearEventCache();

      logger.info(`Event published: ${event.title}`);

      return event;
    } catch (error: any) {
      logger.error('Publish event error:', error);
      throw error;
    }
  }

  /**
   * Cancel event
   */
  async cancelEvent(eventId: string, userId: string, reason: string): Promise<IEvent> {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      const user = await User.findById(userId);
      const isOwner = event.organizerId.toString() === userId;
      const isAdmin = user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        throw new Error('Akses tidak diizinkan');
      }

      event.status = 'cancelled';
      await event.save();

      // Clear cache
      await this.clearEventCache();

      logger.info(`Event cancelled: ${event.title}. Reason: ${reason}`);

      // Notify all participants and process refunds asynchronously
      this.processEventCancellation(eventId, reason).catch(error => {
        logger.error('Error processing event cancellation:', error);
      });

      return event;
    } catch (error: any) {
      logger.error('Cancel event error:', error);
      throw error;
    }
  }

  /**
   * Process event cancellation (notifications and refunds)
   */
  private async processEventCancellation(eventId: string, reason: string): Promise<void> {
    try {
      const Registration = (await import('../models/Registration')).default;
      const event = await Event.findById(eventId);
      
      if (!event) return;

      const confirmedRegistrations = await Registration.find({
        eventId,
        status: { $in: ['confirmed', 'pending'] },
      });

      logger.info(`Processing cancellation for ${confirmedRegistrations.length} registrations`);

      for (const registration of confirmedRegistrations) {
        try {
          // Update registration status
          registration.status = 'cancelled';
          registration.cancellation = {
            cancelledAt: new Date(),
            reason,
            refundStatus: registration.payment.status === 'paid' ? 'pending' : 'not_applicable',
          };
          await registration.save();

          // Send email notification
          const emailService = (await import('./email.service'));
          await emailService.sendEmail({
            to: registration.participant.email,
            subject: `Event Dibatalkan: ${event.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ef4444;">❌ Event Dibatalkan</h2>
                <p>Halo ${registration.participant.fullName},</p>
                <p>Kami informasikan bahwa event <strong>${event.title}</strong> telah dibatalkan.</p>
                <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 0;"><strong>Alasan:</strong> ${reason}</p>
                </div>
                ${registration.payment.status === 'paid' 
                  ? '<p><strong>Refund:</strong> Dana Anda akan dikembalikan dalam 3-7 hari kerja.</p>' 
                  : ''}
                <p>Mohon maaf atas ketidaknyamanannya. Terima kasih atas pengertiannya.</p>
              </div>
            `,
          });

          // Send WhatsApp notification
          const whatsappService = (await import('./whatsapp.service')).default;
          await whatsappService.sendEventCancelled(registration, event, reason);

          // Send in-app notification
          const notificationService = (await import('./notification.service')).default;
          await notificationService.sendNotification({
            userId: registration.userId.toString(),
            type: 'event_cancelled',
            title: `Event Dibatalkan: ${event.title}`,
            message: `Event telah dibatalkan. ${registration.payment.status === 'paid' ? 'Refund akan diproses.' : ''}`,
            metadata: { eventId, reason },
          });

        } catch (error) {
          logger.error(`Failed to process cancellation for registration ${registration._id}:`, error);
        }
      }

      logger.info(`Event cancellation processing completed for ${eventId}`);
    } catch (error) {
      logger.error('Process event cancellation error:', error);
    }
  }

  /**
   * Update ticket availability
   */
  async updateTicketAvailability(eventId: string, ticketTypeId: string, soldCount: number, reservedCount: number): Promise<void> {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      const ticketType = event.ticketTypes.find((t) => t._id?.toString() === ticketTypeId);
      if (!ticketType) {
        throw new Error('Tipe tiket tidak ditemukan');
      }

      ticketType.sold = soldCount;
      ticketType.reserved = reservedCount;
      ticketType.available = ticketType.quota - soldCount - reservedCount;

      // Update total stats
      event.stats.totalSold = event.ticketTypes.reduce((sum, t) => sum + t.sold, 0);
      event.stats.totalRevenue = event.ticketTypes.reduce((sum, t) => sum + (t.sold * t.price), 0);

      await event.save();

      // Clear cache
      await redisClient.del(`${this.CACHE_PREFIX}${eventId}`);
      await redisClient.del(`${this.CACHE_PREFIX}slug:${event.slug}`);
    } catch (error: any) {
      logger.error('Update ticket availability error:', error);
      throw error;
    }
  }

  /**
   * Increment view count
   */
  private async incrementViewCount(eventId: string): Promise<void> {
    try {
      await Event.findByIdAndUpdate(eventId, {
        $inc: { 'stats.viewCount': 1 },
      });
    } catch (error: any) {
      logger.error('Increment view count error:', error);
    }
  }

  /**
   * Increment share count
   */
  async incrementShareCount(eventId: string): Promise<void> {
    try {
      await Event.findByIdAndUpdate(eventId, {
        $inc: { 'stats.shareCount': 1 },
      });

      await redisClient.del(`${this.CACHE_PREFIX}${eventId}`);
    } catch (error: any) {
      logger.error('Increment share count error:', error);
      throw error;
    }
  }

  /**
   * Clear event cache
   */
  private async clearEventCache(): Promise<void> {
    try {
      await redisClient.delPattern(`${this.CACHE_PREFIX}*`);
    } catch (error: any) {
      logger.error('Clear event cache error:', error);
    }
  }

  /**
   * Get organizer events
   */
  async getOrganizerEvents(organizerId: string, status?: string): Promise<IEvent[]> {
    try {
      const query: any = { organizerId };
      if (status) query.status = status;

      const events = await Event.find(query).sort({ createdAt: -1 }).lean();

      return events as unknown as IEvent[];
    } catch (error: any) {
      logger.error('Get organizer events error:', error);
      throw error;
    }
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(eventId: string): Promise<any> {
    try {
      const event = await Event.findById(eventId).lean();
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      return {
        totalQuota: event.stats.totalQuota,
        totalSold: event.stats.totalSold,
        totalRevenue: event.stats.totalRevenue,
        viewCount: event.stats.viewCount,
        shareCount: event.stats.shareCount,
        favoriteCount: event.stats.favoriteCount,
        ticketTypes: event.ticketTypes.map((t) => ({
          name: t.name,
          sold: t.sold,
          available: t.available,
          quota: t.quota,
          revenue: t.sold * t.price,
        })),
      };
    } catch (error: any) {
      logger.error('Get event statistics error:', error);
      throw error;
    }
  }
}

export default new EventService();
