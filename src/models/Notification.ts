import mongoose, { Document, Schema } from 'mongoose';

export type NotificationChannel = 'inApp' | 'email' | 'whatsapp' | 'push';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';
export type NotificationType = 'event_reminder' | 'payment_success' | 'registration_confirmed' | 'event_update' | 'event_cancelled' | 'check_in_success' | 'new_event';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  relatedEvent?: mongoose.Types.ObjectId;
  relatedRegistration?: mongoose.Types.ObjectId;
  channels: {
    inApp: boolean;
    email: boolean;
    whatsapp: boolean;
    push: boolean;
  };
  isRead: boolean;
  readAt?: Date;
  sentAt?: Date;
  status?: NotificationStatus;
  error?: string;
  deliveryStatus?: {
    email?: 'pending' | 'sent' | 'delivered' | 'failed';
    whatsapp?: 'pending' | 'sent' | 'delivered' | 'failed';
    push?: 'pending' | 'sent' | 'delivered' | 'failed';
  };
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID wajib diisi'],
      index: true,
    },
    type: {
      type: String,
      enum: ['event_reminder', 'payment_success', 'registration_confirmed', 'event_update', 'event_cancelled', 'check_in_success', 'new_event'],
      required: [true, 'Tipe notifikasi wajib diisi'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Judul notifikasi wajib diisi'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Pesan notifikasi wajib diisi'],
      trim: true,
    },
    icon: String,
    actionUrl: String,
    relatedEvent: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      index: true,
    },
    relatedRegistration: {
      type: Schema.Types.ObjectId,
      ref: 'Registration',
    },
    channels: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
      },
      whatsapp: {
        type: Boolean,
        default: false,
      },
      push: {
        type: Boolean,
        default: false,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,
    sentAt: Date,
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'delivered'],
      default: 'pending',
    },
    error: String,
    deliveryStatus: {
      email: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed'],
      },
      whatsapp: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed'],
      },
      push: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed'],
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
