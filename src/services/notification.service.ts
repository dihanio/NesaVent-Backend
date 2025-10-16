import Notification, { INotification, NotificationChannel, NotificationStatus, NotificationType } from '../models/Notification';
import User from '../models/User';
import emailService from '../services/email.service';
import whatsappService from '../services/whatsapp.service';
import logger from '../utils/logger';

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  metadata?: any;
  actionUrl?: string;
}

export interface BulkNotificationParams {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  metadata?: any;
  actionUrl?: string;
}

class NotificationService {
  /**
   * Send notification to a single user
   */
  async sendNotification(params: SendNotificationParams): Promise<INotification> {
    try {
      // Get user details
      const user = await User.findById(params.userId);
      if (!user) {
        throw new Error('User tidak ditemukan');
      }

      // Determine channels based on user preferences
      let channels = params.channels || ['inApp'];
      
      // Check user notification preferences
      if (!user.preferences?.notifications?.email) {
        channels = channels.filter(c => c !== 'email');
      }

      if (!user.preferences?.notifications?.whatsapp) {
        channels = channels.filter(c => c !== 'whatsapp');
      }

      if (!user.preferences?.notifications?.push) {
        channels = channels.filter(c => c !== 'push');
      }

      // Create notification record
      const notification = await Notification.create({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        channels,
        status: 'pending',
        metadata: params.metadata,
        actionUrl: params.actionUrl,
      });

      // Send via each channel
      for (const channel of channels) {
        await this.sendViaChannel(notification, channel, user);
      }

      logger.info(`Notification sent to user ${params.userId} via ${channels.join(', ')}`);

      return notification;
    } catch (error: any) {
      logger.error('Send notification error:', error);
      throw error;
    }
  }

  /**
   * Send notifications to multiple users
   */
  async sendBulkNotifications(params: BulkNotificationParams): Promise<number> {
    try {
      let successCount = 0;

      for (const userId of params.userIds) {
        try {
          await this.sendNotification({
            userId,
            type: params.type,
            title: params.title,
            message: params.message,
            channels: params.channels,
            metadata: params.metadata,
            actionUrl: params.actionUrl,
          });
          successCount++;
        } catch (error) {
          logger.error(`Failed to send notification to user ${userId}:`, error);
        }
      }

      logger.info(`Bulk notifications sent: ${successCount}/${params.userIds.length} successful`);

      return successCount;
    } catch (error: any) {
      logger.error('Send bulk notifications error:', error);
      throw error;
    }
  }

  /**
   * Send via specific channel
   */
  private async sendViaChannel(notification: INotification, channel: NotificationChannel, user: any): Promise<void> {
    try {
      switch (channel) {
        case 'email':
          await this.sendViaEmail(notification, user);
          break;
        case 'whatsapp':
          await this.sendViaWhatsApp(notification, user);
          break;
        case 'push':
          await this.sendViaPush(notification, user);
          break;
        case 'inApp':
          // In-app notifications are stored in database
          notification.status = 'sent';
          await notification.save();
          break;
      }
    } catch (error: any) {
      logger.error(`Failed to send via ${channel}:`, error);
      notification.error = error.message;
      notification.status = 'failed';
      await notification.save();
    }
  }

  /**
   * Send via email
   */
  private async sendViaEmail(notification: INotification, user: any): Promise<void> {
    try {
      // Simple text email notification
      await emailService.sendEmail({
        to: user.email,
        subject: notification.title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${notification.title}</h2>
            <p style="color: #666; line-height: 1.6;">${notification.message}</p>
            ${notification.actionUrl ? `
              <div style="margin: 20px 0;">
                <a href="${notification.actionUrl}" 
                   style="background: #007bff; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 4px; display: inline-block;">
                  Lihat Detail
                </a>
              </div>
            ` : ''}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              Notifikasi ini dikirim oleh Nesavent. 
              Jika Anda tidak ingin menerima notifikasi, silakan ubah pengaturan akun Anda.
            </p>
          </div>
        `,
      });

      notification.deliveryStatus = notification.deliveryStatus || {};
      notification.deliveryStatus.email = 'delivered';
      notification.sentAt = new Date();
      notification.status = 'sent';

      await notification.save();
    } catch (error: any) {
      logger.error('Send via email error:', error);
      notification.deliveryStatus = notification.deliveryStatus || {};
      notification.deliveryStatus.email = 'failed';
      notification.status = 'failed';
      await notification.save();
      throw error;
    }
  }

  /**
   * Send via WhatsApp
   */
  private async sendViaWhatsApp(notification: INotification, user: any): Promise<void> {
    try {
      let whatsappMessage = `*${notification.title}*\n\n${notification.message}`;
      
      if (notification.actionUrl) {
        whatsappMessage += `\n\n🔗 ${notification.actionUrl}`;
      }

      const sent = await whatsappService.sendWhatsApp({
        target: user.profile?.phone || '',
        message: whatsappMessage,
      });

      if (sent) {
        notification.deliveryStatus = notification.deliveryStatus || {};
        notification.deliveryStatus.whatsapp = 'delivered';
        notification.sentAt = new Date();
        notification.status = 'sent';
      } else {
        notification.deliveryStatus = notification.deliveryStatus || {};
        notification.deliveryStatus.whatsapp = 'failed';
        notification.status = 'failed';
      }

      await notification.save();
    } catch (error: any) {
      logger.error('Send via WhatsApp error:', error);
      throw error;
    }
  }

  /**
   * Send via push notification
   */
  private async sendViaPush(notification: INotification, user: any): Promise<void> {
    try {
      // Push notification implementation would go here
      // This requires FCM (Firebase Cloud Messaging) or similar service
      // For now, mark as sent
      notification.deliveryStatus = notification.deliveryStatus || {};
      notification.deliveryStatus.push = 'delivered';
      notification.sentAt = new Date();
      notification.status = 'sent';
      await notification.save();

      logger.info('Push notification would be sent here (not implemented)');
    } catch (error: any) {
      logger.error('Send via push error:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<INotification[]> {
    try {
      const query: any = { userId };
      if (unreadOnly) {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return notifications as unknown as INotification[];
    } catch (error: any) {
      logger.error('Get user notifications error:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await Notification.findOne({ _id: notificationId, userId });
      
      if (!notification) {
        throw new Error('Notification tidak ditemukan');
      }

      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();

      logger.info(`Notification ${notificationId} marked as read`);
    } catch (error: any) {
      logger.error('Mark as read error:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );

      logger.info(`${result.modifiedCount} notifications marked as read for user ${userId}`);

      return result.modifiedCount;
    } catch (error: any) {
      logger.error('Mark all as read error:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await Notification.deleteOne({ _id: notificationId, userId });
      
      if (result.deletedCount === 0) {
        throw new Error('Notification tidak ditemukan');
      }

      logger.info(`Notification ${notificationId} deleted`);
    } catch (error: any) {
      logger.error('Delete notification error:', error);
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await Notification.countDocuments({ userId, isRead: false });
      return count;
    } catch (error: any) {
      logger.error('Get unread count error:', error);
      throw error;
    }
  }

  /**
   * Clean old notifications (older than 90 days)
   */
  async cleanOldNotifications(): Promise<number> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await Notification.deleteMany({
        createdAt: { $lt: ninetyDaysAgo },
        isRead: true,
      });

      logger.info(`${result.deletedCount} old notifications cleaned`);

      return result.deletedCount;
    } catch (error: any) {
      logger.error('Clean old notifications error:', error);
      throw error;
    }
  }
}

export default new NotificationService();
