import mongoose, { Document, Schema } from 'mongoose';
import { nanoid } from 'nanoid';

export interface IParticipant {
  fullName: string;
  email: string;
  phone: string;
  nim?: string;
  prodi?: string;
  angkatan?: string;
  institution?: string;
  additionalInfo?: Record<string, any>;
}

export interface IPayment {
  method: string;
  provider?: string;
  status: 'pending' | 'paid' | 'expired' | 'failed' | 'refunded';
  amount: number;
  adminFee: number;
  totalAmount: number;
  currency: string;
  snapToken?: string;
  snapUrl?: string;
  transactionId?: string;
  orderId: string;
  paidAt?: Date;
  expiredAt: Date;
  refundedAt?: Date;
  refundReason?: string;
}

export interface ICheckIn {
  checkedAt?: Date;
  checkedBy?: mongoose.Types.ObjectId;
  location?: string;
  deviceInfo?: string;
}

export interface ITicket {
  ticketNumber: string;
  qrCode: string;
  qrCodeUrl?: string;
  pdfUrl?: string;
  status: 'valid' | 'used' | 'cancelled' | 'expired';
  checkIn?: ICheckIn;
}

export interface ICancellation {
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  reason?: string;
  refundStatus?: string;
}

export interface INotifications {
  reminderSent: boolean;
  confirmationSent: boolean;
  thankYouSent: boolean;
}

export interface IRegistration extends Document {
  _id: mongoose.Types.ObjectId;
  registrationNumber: string;
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  organizerId: mongoose.Types.ObjectId;
  ticketType: {
    id: mongoose.Types.ObjectId;
    name: string;
    price: number;
  };
  quantity: number;
  participant: IParticipant;
  payment: IPayment;
  ticket: ITicket;
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'attended' | 'no_show';
  cancellation?: ICancellation;
  notifications: INotifications;
  source: string;
  referralCode?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const registrationSchema = new Schema<IRegistration>(
  {
    registrationNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID wajib diisi'],
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID wajib diisi'],
      index: true,
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer ID wajib diisi'],
      index: true,
    },
    ticketType: {
      id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    participant: {
      fullName: {
        type: String,
        required: [true, 'Nama lengkap wajib diisi'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Email wajib diisi'],
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        required: [true, 'Nomor telepon wajib diisi'],
        trim: true,
      },
      nim: String,
      prodi: String,
      angkatan: String,
      institution: String,
      additionalInfo: Schema.Types.Mixed,
    },
    payment: {
      method: {
        type: String,
        required: true,
      },
      provider: String,
      status: {
        type: String,
        enum: ['pending', 'paid', 'expired', 'failed', 'refunded'],
        default: 'pending',
        required: true,
        index: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      adminFee: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        default: 'IDR',
      },
      snapToken: String,
      snapUrl: String,
      transactionId: {
        type: String,
        index: true,
        sparse: true,
      },
      orderId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
      paidAt: Date,
      expiredAt: {
        type: Date,
        required: true,
        index: true,
      },
      refundedAt: Date,
      refundReason: String,
    },
    ticket: {
      ticketNumber: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
      },
      qrCode: {
        type: String,
        sparse: true,
      },
      qrCodeUrl: String,
      pdfUrl: String,
      status: {
        type: String,
        enum: ['valid', 'used', 'cancelled', 'expired'],
        default: 'valid',
        index: true,
      },
      checkIn: {
        checkedAt: Date,
        checkedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        location: String,
        deviceInfo: String,
      },
    },
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'cancelled', 'attended', 'no_show'],
      default: 'pending_payment',
      required: true,
      index: true,
    },
    cancellation: {
      cancelledAt: Date,
      cancelledBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: String,
      refundStatus: String,
    },
    notifications: {
      reminderSent: {
        type: Boolean,
        default: false,
      },
      confirmationSent: {
        type: Boolean,
        default: false,
      },
      thankYouSent: {
        type: Boolean,
        default: false,
      },
    },
    source: {
      type: String,
      default: 'web',
    },
    referralCode: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for performance
registrationSchema.index({ userId: 1, eventId: 1 });
registrationSchema.index({ eventId: 1, status: 1 });
registrationSchema.index({ organizerId: 1, createdAt: -1 });
registrationSchema.index({ 'payment.status': 1, 'payment.expiredAt': 1 });
registrationSchema.index({ 'ticket.ticketNumber': 1 }, { sparse: true });

// Generate registration number before save
registrationSchema.pre('save', async function (next) {
  if (this.isNew && !this.registrationNumber) {
    const year = new Date().getFullYear();
    const randomId = nanoid(10).toUpperCase();
    this.registrationNumber = `NV-${year}-${randomId}`;
  }
  next();
});

// Generate ticket number when payment is confirmed
registrationSchema.pre('save', function (next) {
  if (this.isModified('payment.status') && this.payment.status === 'paid' && !this.ticket.ticketNumber) {
    const year = new Date().getFullYear();
    const randomId = nanoid(12).toUpperCase();
    this.ticket.ticketNumber = `NV-TIX-${year}-${randomId}`;
    this.status = 'confirmed';
  }
  next();
});

const Registration = mongoose.model<IRegistration>('Registration', registrationSchema);

export default Registration;
