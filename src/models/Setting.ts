import mongoose, { Document, Schema } from 'mongoose';

export interface ISetting extends Document {
  category: 'general' | 'payment' | 'email' | 'whatsapp' | 'notification' | 'feature_flags';
  key: string;
  value: any;
  description?: string;
  isPublic: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    category: {
      type: String,
      enum: ['general', 'payment', 'email', 'whatsapp', 'notification', 'feature_flags'],
      required: [true, 'Kategori setting wajib diisi'],
      index: true,
    },
    key: {
      type: String,
      required: [true, 'Key setting wajib diisi'],
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: [true, 'Value setting wajib diisi'],
    },
    description: {
      type: String,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index
settingSchema.index({ category: 1, isPublic: 1 });

const Setting = mongoose.model<ISetting>('Setting', settingSchema);

export default Setting;
