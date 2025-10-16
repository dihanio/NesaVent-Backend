import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config';

export interface IUserProfile {
  fullName: string;
  nim?: string;
  prodi?: string;
  angkatan?: string;
  phone: string;
  avatar?: string;
  bio?: string;
  socialMedia?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
}

export interface IStudent {
  nim?: string;
  prodi?: string;
  angkatan?: string;
}

export interface IOrganization {
  name?: string;
  position?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDoc?: string;
  description?: string;
  logo?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export interface IPreferences {
  language: 'id' | 'en';
  notifications: {
    email: boolean;
    whatsapp: boolean;
    push: boolean;
  };
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: string;
  email: string;
  password: string;
  profile: IUserProfile;
  role: 'admin' | 'organization' | 'student' | 'user';
  accountType: 'campus' | 'external';
  student?: IStudent;
  interests?: string[];
  organization?: IOrganization;
  emailVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  preferences: IPreferences;
  lastLogin?: Date;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {
  hashPassword(password: string): Promise<string>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email wajib diisi'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Format email tidak valid'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password wajib diisi'],
      minlength: [8, 'Password minimal 8 karakter'],
      select: false,
    },
    profile: {
      fullName: {
        type: String,
        required: [true, 'Nama lengkap wajib diisi'],
        trim: true,
        minlength: [3, 'Nama minimal 3 karakter'],
        maxlength: [100, 'Nama maksimal 100 karakter'],
      },
      nim: {
        type: String,
        trim: true,
        sparse: true,
        index: true,
      },
      prodi: {
        type: String,
        trim: true,
      },
      angkatan: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        required: [true, 'Nomor telepon wajib diisi'],
        trim: true,
        match: [/^(\+62|62|0)[0-9]{9,13}$/, 'Format nomor telepon tidak valid'],
      },
      avatar: {
        type: String,
        default: null,
      },
      bio: {
        type: String,
        maxlength: [500, 'Bio maksimal 500 karakter'],
      },
      socialMedia: {
        instagram: { type: String },
        twitter: { type: String },
        linkedin: { type: String },
        facebook: { type: String },
      },
    },
    student: {
      nim: { type: String, trim: true },
      prodi: { type: String, trim: true },
      angkatan: { type: String, trim: true },
    },
    interests: {
      type: [String],
      default: [],
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'organization', 'student', 'user'],
        message: 'Role tidak valid',
      },
      default: 'student',
      required: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: {
        values: ['campus', 'external'],
        message: 'Tipe akun tidak valid',
      },
      default: 'campus',
      required: true,
      index: true,
    },
    organization: {
      name: {
        type: String,
        trim: true,
      },
      position: {
        type: String,
        trim: true,
      },
      verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
      },
      verificationDoc: {
        type: String,
      },
      description: { type: String },
      logo: { type: String },
      website: { type: String },
      contactEmail: { type: String },
      contactPhone: { type: String },
      address: { type: String },
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    preferences: {
      language: {
        type: String,
        enum: ['id', 'en'],
        default: 'id',
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        whatsapp: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
    },
    lastLogin: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, __v, ...rest } = ret;
        return rest;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes for performance
userSchema.index({ email: 1, emailVerified: 1 });
userSchema.index({ 'profile.nim': 1 }, { sparse: true });
userSchema.index({ role: 1, accountType: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Static method to hash password
userSchema.statics.hashPassword = async function (password: string): Promise<string> {
  const salt = await bcrypt.genSalt(config.security.bcryptRounds);
  return await bcrypt.hash(password, salt);
};

const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;
