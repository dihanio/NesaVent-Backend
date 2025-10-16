import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  nameEn: string;
  slug: string;
  icon: string;
  color: string;
  gradient: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  eventCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Nama kategori wajib diisi'],
      unique: true,
      trim: true,
    },
    nameEn: {
      type: String,
      required: [true, 'Nama kategori (English) wajib diisi'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    icon: {
      type: String,
      required: [true, 'Icon wajib diisi'],
      default: 'calendar',
    },
    color: {
      type: String,
      required: [true, 'Warna wajib diisi'],
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Format warna hex tidak valid'],
      default: '#3b82f6',
    },
    gradient: {
      type: String,
      default: 'from-blue-500 to-blue-600',
    },
    description: {
      type: String,
      maxlength: [500, 'Deskripsi maksimal 500 karakter'],
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    eventCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for sorting
categorySchema.index({ displayOrder: 1, name: 1 });

const Category = mongoose.model<ICategory>('Category', categorySchema);

export default Category;
