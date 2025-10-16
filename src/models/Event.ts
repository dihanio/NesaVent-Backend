import mongoose, { Document, Schema } from 'mongoose';
import slug from 'slug';

export interface IVenue {
  type: 'offline' | 'online' | 'hybrid';
  name?: string;
  building?: string;
  room?: string;
  address?: string;
  city?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  mapLink?: string;
  onlineLink?: string;
}

export interface ISchedule {
  start: Date;
  end: Date;
  registrationOpen: Date;
  registrationClose: Date;
  timezone: string;
}

export interface ITicketType {
  _id?: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quota: number;
  sold: number;
  reserved: number;
  available: number;
  description?: string;
  benefits: string[];
  salesStart: Date;
  salesEnd: Date;
  isActive: boolean;
}

export interface IApproval {
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  adminNotes?: string;
}

export interface IFAQ {
  question: string;
  answer: string;
}

export interface IContactPerson {
  name: string;
  phone: string;
  email: string;
  line?: string;
  instagram?: string;
  whatsapp?: string;
}

export interface IStats {
  totalQuota: number;
  totalSold: number;
  totalRevenue: number;
  viewCount: number;
  shareCount: number;
  favoriteCount: number;
}

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  organizerId: mongoose.Types.ObjectId;
  organizationName: string;
  title: string;
  slug: string;
  description: string;
  category: 'seminar' | 'workshop' | 'competition' | 'festival' | 'webinar' | 'sport' | 'art' | 'bazaar' | 'talkshow' | 'other';
  poster: string;
  gallery: string[];
  venue: IVenue;
  location?: IVenue;
  schedule: ISchedule;
  ticketTypes: ITicketType[];
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  approval: IApproval;
  requirements: string[];
  terms?: string;
  faq: IFAQ[];
  contactPerson: IContactPerson;
  stats: IStats;
  tags: string[];
  featured: boolean;
  featuredUntil?: Date;
  visibility: 'public' | 'private' | 'unlisted';
  rating?: number;
  reviewCount?: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  completedAt?: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer ID wajib diisi'],
      index: true,
    },
    organizationName: {
      type: String,
      required: [true, 'Nama organisasi wajib diisi'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Judul event wajib diisi'],
      trim: true,
      minlength: [10, 'Judul minimal 10 karakter'],
      maxlength: [200, 'Judul maksimal 200 karakter'],
      index: 'text',
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Deskripsi event wajib diisi'],
      minlength: [50, 'Deskripsi minimal 50 karakter'],
      maxlength: [5000, 'Deskripsi maksimal 5000 karakter'],
      index: 'text',
    },
    category: {
      type: String,
      enum: {
        values: ['seminar', 'workshop', 'competition', 'festival', 'webinar', 'sport', 'art', 'bazaar', 'talkshow', 'other'],
        message: 'Kategori event tidak valid',
      },
      required: [true, 'Kategori event wajib diisi'],
      index: true,
    },
    poster: {
      type: String,
      required: [true, 'Poster event wajib diisi'],
    },
    gallery: [{
      type: String,
    }],
    venue: {
      type: {
        type: String,
        enum: ['offline', 'online', 'hybrid'],
        required: [true, 'Tipe venue wajib diisi'],
      },
      name: String,
      building: String,
      room: String,
      address: String,
      city: {
        type: String,
        index: true,
      },
      coordinates: {
        lat: Number,
        lng: Number,
      },
      mapLink: String,
      onlineLink: String,
    },
    schedule: {
      start: {
        type: Date,
        required: [true, 'Waktu mulai event wajib diisi'],
        index: true,
      },
      end: {
        type: Date,
        required: [true, 'Waktu selesai event wajib diisi'],
      },
      registrationOpen: {
        type: Date,
        required: [true, 'Waktu buka registrasi wajib diisi'],
        index: true,
      },
      registrationClose: {
        type: Date,
        required: [true, 'Waktu tutup registrasi wajib diisi'],
        index: true,
      },
      timezone: {
        type: String,
        default: 'Asia/Jakarta',
      },
    },
    ticketTypes: [{
      name: {
        type: String,
        required: [true, 'Nama tiket wajib diisi'],
        trim: true,
      },
      price: {
        type: Number,
        required: [true, 'Harga tiket wajib diisi'],
        min: [0, 'Harga tiket tidak boleh negatif'],
      },
      quota: {
        type: Number,
        required: [true, 'Kuota tiket wajib diisi'],
        min: [1, 'Kuota minimal 1'],
      },
      sold: {
        type: Number,
        default: 0,
        min: 0,
      },
      reserved: {
        type: Number,
        default: 0,
        min: 0,
      },
      available: {
        type: Number,
        default: function(this: ITicketType) {
          return this.quota - this.sold - this.reserved;
        },
      },
      description: String,
      benefits: [String],
      salesStart: {
        type: Date,
        required: true,
      },
      salesEnd: {
        type: Date,
        required: true,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    }],
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'rejected', 'published', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
      required: true,
      index: true,
    },
    approval: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      approvedAt: Date,
      rejectionReason: String,
      adminNotes: String,
    },
    requirements: [String],
    terms: String,
    faq: [{
      question: {
        type: String,
        required: true,
      },
      answer: {
        type: String,
        required: true,
      },
    }],
    contactPerson: {
      name: {
        type: String,
        required: [true, 'Nama contact person wajib diisi'],
      },
      phone: {
        type: String,
        required: [true, 'Nomor telepon contact person wajib diisi'],
      },
      email: {
        type: String,
        required: [true, 'Email contact person wajib diisi'],
      },
      line: String,
      instagram: String,
      whatsapp: String,
    },
    stats: {
      totalQuota: {
        type: Number,
        default: 0,
      },
      totalSold: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      viewCount: {
        type: Number,
        default: 0,
      },
      shareCount: {
        type: Number,
        default: 0,
      },
      favoriteCount: {
        type: Number,
        default: 0,
      },
    },
    tags: [{
      type: String,
      lowercase: true,
      trim: true,
    }],
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    featuredUntil: Date,
    visibility: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      default: 'public',
      index: true,
    },
    publishedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for performance
eventSchema.index({ status: 1, visibility: 1, 'schedule.start': 1 });
eventSchema.index({ organizerId: 1, status: 1 });
eventSchema.index({ category: 1, status: 1, 'schedule.start': 1 });
eventSchema.index({ featured: 1, status: 1, 'schedule.start': 1 });
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Pre-save middleware to generate slug
eventSchema.pre('save', async function (next) {
  if (this.isModified('title') || this.isNew) {
    let baseSlug = slug(this.title, { lower: true });
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (await mongoose.models.Event.findOne({ slug: uniqueSlug, _id: { $ne: this._id } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = uniqueSlug;
  }

  // Calculate total quota
  if (this.isModified('ticketTypes')) {
    this.stats.totalQuota = this.ticketTypes.reduce((sum, ticket) => sum + ticket.quota, 0);
    
    // Update available tickets
    this.ticketTypes.forEach(ticket => {
      ticket.available = ticket.quota - ticket.sold - ticket.reserved;
    });
  }

  next();
});

// Virtual for registration status
eventSchema.virtual('isRegistrationOpen').get(function () {
  const now = new Date();
  return (
    now >= this.schedule.registrationOpen &&
    now <= this.schedule.registrationClose &&
    this.status === 'published' &&
    this.stats.totalSold < this.stats.totalQuota
  );
});

// Virtual for event status
eventSchema.virtual('eventStatus').get(function () {
  const now = new Date();
  if (now < this.schedule.start) return 'upcoming';
  if (now >= this.schedule.start && now <= this.schedule.end) return 'ongoing';
  return 'completed';
});

const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event;
