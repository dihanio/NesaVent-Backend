import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { uploadUserAvatar } from '../services/cloudinary.service';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

/**
 * Get user profile
 */
export const getUserProfile = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires').lean();

    if (!user) {
      sendError(res, 'User tidak ditemukan', 404);
      return;
    }

    sendSuccess(res, 'User profile berhasil diambil', user);
  } catch (error: any) {
    logger.error('Get user profile error:', error);
    sendError(res, error.message || 'Gagal mengambil user profile', 400);
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { fullName, phone, bio, nim, prodi, angkatan, interests, socialMedia } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'User tidak ditemukan', 404);
      return;
    }

    // Update profile fields
    if (fullName) user.profile.fullName = fullName;
    if (phone) user.profile.phone = phone;
    if (bio !== undefined) user.profile.bio = bio;

    // Update student fields
    if (nim !== undefined || prodi !== undefined || angkatan !== undefined) {
      if (!user.student) {
        user.student = {};
      }
      if (nim !== undefined) user.student.nim = nim;
      if (prodi !== undefined) user.student.prodi = prodi;
      if (angkatan !== undefined) user.student.angkatan = angkatan;
    }

    // Update interests
    if (interests) user.interests = interests;

    // Update social media
    if (socialMedia) {
      user.profile.socialMedia = {
        ...user.profile.socialMedia,
        ...socialMedia,
      };
    }

    await user.save();

    sendSuccess(res, 'Profile berhasil diupdate', user);
  } catch (error: any) {
    logger.error('Update profile error:', error);
    sendError(res, error.message || 'Gagal mengupdate profile', 400);
  }
};

/**
 * Upload avatar
 */
export const uploadAvatar = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { avatar } = req.body; // Base64 or data URL

    if (!avatar) {
      sendError(res, 'Avatar tidak boleh kosong', 400);
      return;
    }

    // Upload to Cloudinary
    const avatarUrl = await uploadUserAvatar(avatar, userId.toString());

    // Update user
    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'User tidak ditemukan', 404);
      return;
    }

    user.profile.avatar = avatarUrl;
    await user.save();

    sendSuccess(res, 'Avatar berhasil diupload', { avatarUrl });
  } catch (error: any) {
    logger.error('Upload avatar error:', error);
    sendError(res, error.message || 'Gagal upload avatar', 400);
  }
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { email, whatsapp, push } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'User tidak ditemukan', 404);
      return;
    }

    if (!user.preferences) {
      user.preferences = {
        language: 'id',
        notifications: { email: true, whatsapp: true, push: true }
      };
    }

    if (email !== undefined) user.preferences.notifications.email = email;
    if (whatsapp !== undefined) user.preferences.notifications.whatsapp = whatsapp;
    if (push !== undefined) user.preferences.notifications.push = push;

    await user.save();

    sendSuccess(res, 'Notification preferences berhasil diupdate', user.preferences);
  } catch (error: any) {
    logger.error('Update notification preferences error:', error);
    sendError(res, error.message || 'Gagal mengupdate preferences', 400);
  }
};

/**
 * Update organization info (organization role only)
 */
export const updateOrganizationInfo = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'User tidak ditemukan', 404);
      return;
    }

    if (user.role !== 'organization') {
      sendError(res, 'Hanya untuk akun organization', 403);
      return;
    }

    const { name, description, logo, website, contactEmail, contactPhone, address } = req.body;

    if (!user.organization) {
      user.organization = {
        verificationStatus: 'pending',
      };
    }

    if (name) user.organization.name = name;
    if (description !== undefined) user.organization.description = description;
    if (logo !== undefined) user.organization.logo = logo;
    if (website !== undefined) user.organization.website = website;
    if (contactEmail !== undefined) user.organization.contactEmail = contactEmail;
    if (contactPhone !== undefined) user.organization.contactPhone = contactPhone;
    if (address !== undefined) user.organization.address = address;

    await user.save();

    sendSuccess(res, 'Organization info berhasil diupdate', user.organization);
  } catch (error: any) {
    logger.error('Update organization info error:', error);
    sendError(res, error.message || 'Gagal mengupdate organization info', 400);
  }
};

/**
 * Get user statistics
 */
export const getUserStatistics = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const Registration = require('../models/Registration').default;
    const Event = require('../models/Event').default;
    const Review = require('../models/Review').default;

    const [registrations, organizedEvents, reviews] = await Promise.all([
      Registration.countDocuments({ userId }),
      Event.countDocuments({ organizerId: userId }),
      Review.countDocuments({ userId }),
    ]);

    const stats = {
      registrations,
      organizedEvents,
      reviews,
    };

    sendSuccess(res, 'User statistics berhasil diambil', stats);
  } catch (error: any) {
    logger.error('Get user statistics error:', error);
    sendError(res, error.message || 'Gagal mengambil statistics', 400);
  }
};

/**
 * Delete user account
 */
export const deleteAccount = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'User tidak ditemukan', 404);
      return;
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      sendError(res, 'Password salah', 401);
      return;
    }

    // Check for active registrations
    const Registration = require('../models/Registration').default;
    const activeRegistrations = await Registration.countDocuments({
      userId,
      status: { $in: ['confirmed', 'pending_payment'] },
    });

    if (activeRegistrations > 0) {
      sendError(res, 'Tidak dapat menghapus akun dengan registrasi aktif', 400);
      return;
    }

    // Soft delete (you can implement hard delete if needed)
    user.isActive = false;
    await user.save();

    sendSuccess(res, 'Akun berhasil dihapus', null);
  } catch (error: any) {
    logger.error('Delete account error:', error);
    sendError(res, error.message || 'Gagal menghapus akun', 400);
  }
};
