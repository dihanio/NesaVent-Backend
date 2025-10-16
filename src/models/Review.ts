import mongoose, { Document, Schema } from 'mongoose';

export interface IResponse {
  text: string;
  respondedBy: mongoose.Types.ObjectId;
  respondedAt: Date;
}

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  registrationId: mongoose.Types.ObjectId;
  organizerId?: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  response?: IResponse;
  isPublished: boolean;
  isFlagged: boolean;
  flagReason?: string;
  helpfulCount: number;
  helpfulMarks?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID wajib diisi'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID wajib diisi'],
      index: true,
    },
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: 'Registration',
      required: [true, 'Registration ID wajib diisi'],
      unique: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating wajib diisi'],
      min: [1, 'Rating minimal 1'],
      max: [5, 'Rating maksimal 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Komentar maksimal 1000 karakter'],
    },
    response: {
      text: {
        type: String,
        required: true,
        trim: true,
      },
      respondedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      respondedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    flagReason: String,
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulMarks: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
reviewSchema.index({ eventId: 1, isPublished: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, eventId: 1 });
reviewSchema.index({ rating: 1, createdAt: -1 });

const Review = mongoose.model<IReview>('Review', reviewSchema);

export default Review;
