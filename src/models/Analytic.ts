import mongoose, { Document, Schema } from 'mongoose';

export interface IMetrics {
  views: number;
  registrations: number;
  revenue: number;
  conversion: number;
  avgRating: number;
}

export interface IDemographics {
  byProdi: Record<string, number>;
  byAngkatan: Record<string, number>;
  byGender: Record<string, number>;
}

export interface IAnalytic extends Document {
  eventId?: mongoose.Types.ObjectId;
  organizerId?: mongoose.Types.ObjectId;
  date: Date;
  metrics: IMetrics;
  demographics?: IDemographics;
  createdAt: Date;
}

const analyticSchema = new Schema<IAnalytic>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      index: true,
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Tanggal analitik wajib diisi'],
      index: true,
    },
    metrics: {
      views: {
        type: Number,
        default: 0,
        min: 0,
      },
      registrations: {
        type: Number,
        default: 0,
        min: 0,
      },
      revenue: {
        type: Number,
        default: 0,
        min: 0,
      },
      conversion: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      avgRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
    },
    demographics: {
      byProdi: {
        type: Map,
        of: Number,
        default: {},
      },
      byAngkatan: {
        type: Map,
        of: Number,
        default: {},
      },
      byGender: {
        type: Map,
        of: Number,
        default: {},
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for performance
analyticSchema.index({ eventId: 1, date: -1 });
analyticSchema.index({ organizerId: 1, date: -1 });
analyticSchema.index({ date: -1 });

// Unique constraint to prevent duplicate entries per event per day
analyticSchema.index({ eventId: 1, date: 1 }, { unique: true, sparse: true });

const Analytic = mongoose.model<IAnalytic>('Analytic', analyticSchema);

export default Analytic;
