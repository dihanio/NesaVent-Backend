import User, { IUser } from '../models/User';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { generateToken } from '../utils/crypto';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service';
import redisClient from '../config/redis';
import config from '../config';
import logger from '../utils/logger';

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  nim?: string;
  prodi?: string;
  angkatan?: string;
  role?: 'student' | 'organization' | 'user';
  organizationName?: string;
  organizationDescription?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<{ user: IUser; verificationToken: string }> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: data.email.toLowerCase() });
      if (existingUser) {
        throw new Error('Email sudah terdaftar');
      }

      // Check if it's a campus email
      const isCampusEmail = data.email.toLowerCase().endsWith(config.campus.emailDomain);
      const accountType = isCampusEmail ? 'campus' : 'external';

      // External users can only be regular users
      if (!isCampusEmail && data.role !== 'user') {
        throw new Error('Pengguna eksternal hanya bisa mendaftar sebagai user biasa');
      }

      // Generate verification token
      const verificationToken = generateToken();

      // Prepare user data
      const userData: any = {
        email: data.email.toLowerCase(),
        password: data.password,
        profile: {
          fullName: data.fullName,
          phone: data.phone,
          nim: data.nim,
          prodi: data.prodi,
          angkatan: data.angkatan,
        },
        role: data.role || (isCampusEmail ? 'student' : 'user'),
        accountType,
        verificationToken,
        emailVerified: false,
        preferences: {
          language: 'id',
          notifications: {
            email: true,
            whatsapp: true,
            push: true,
          },
        },
      };

      // Add organization data if role is organization
      if (data.role === 'organization') {
        userData.organization = {
          name: data.organizationName || data.fullName,
          description: data.organizationDescription,
          verificationStatus: 'pending',
        };
      }

      // Create user
      const user = await User.create(userData);

      // Send verification email
      try {
        await sendVerificationEmail(user, verificationToken);
      } catch (emailError) {
        logger.error('Error sending verification email:', emailError);
        // Don't fail registration if email fails
      }

      logger.info(`New user registered: ${user.email}`);

      return { user, verificationToken };
    } catch (error: any) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<IUser> {
    try {
      const user = await User.findOne({ verificationToken: token }).select('+verificationToken');
      
      if (!user) {
        throw new Error('Token verifikasi tidak valid');
      }

      if (user.emailVerified) {
        throw new Error('Email sudah diverifikasi');
      }

      user.emailVerified = true;
      user.verificationToken = undefined;
      await user.save();

      logger.info(`Email verified for user: ${user.email}`);

      return user;
    } catch (error: any) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResult> {
    try {
      // Find user with password field
      const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password');

      if (!user) {
        throw new Error('Email atau password salah');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(data.password);
      if (!isPasswordValid) {
        throw new Error('Email atau password salah');
      }

      // Check if email is verified
      if (!user.emailVerified) {
        throw new Error('Email belum diverifikasi. Silakan cek email Anda.');
      }

      // Generate tokens
      const tokens = generateTokenPair(user);

      // Store refresh token in Redis
      await redisClient.setSession(
        `refresh_token:${user._id}`,
        {
          token: tokens.refreshToken,
          userId: user._id.toString(),
          createdAt: new Date(),
        },
        7 * 24 * 60 * 60 // 7 days
      );

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info(`User logged in: ${user.email}`);

      // Create a plain object without password
      const userResponse = {
        _id: user._id,
        userId: user.userId,
        email: user.email,
        profile: user.profile,
        role: user.role,
        accountType: user.accountType,
        student: user.student,
        interests: user.interests,
        organization: user.organization,
        emailVerified: user.emailVerified,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return {
        user: userResponse as IUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error: any) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Check if token exists in Redis
      const storedSession = await redisClient.getSession<{ token: string; userId: string }>(
        `refresh_token:${payload.userId}`
      );

      if (!storedSession || storedSession.token !== refreshToken) {
        throw new Error('Token tidak valid atau sudah kedaluwarsa');
      }

      // Get user
      const user = await User.findById(payload.userId);
      if (!user) {
        throw new Error('User tidak ditemukan');
      }

      if (!user.emailVerified) {
        throw new Error('Email belum diverifikasi');
      }

      // Generate new tokens
      const tokens = generateTokenPair(user);

      // Update refresh token in Redis
      await redisClient.setSession(
        `refresh_token:${user._id}`,
        {
          token: tokens.refreshToken,
          userId: user._id.toString(),
          createdAt: new Date(),
        },
        7 * 24 * 60 * 60
      );

      logger.info(`Token refreshed for user: ${user.email}`);

      return {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string): Promise<void> {
    try {
      // Remove refresh token from Redis
      await redisClient.deleteSession(`refresh_token:${userId}`);
      logger.info(`User logged out: ${userId}`);
    } catch (error: any) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        // Don't reveal if email exists
        logger.info(`Password reset requested for non-existent email: ${email}`);
        return;
      }

      // Generate reset token
      const resetToken = generateToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetExpires;
      await user.save();

      // Send reset email
      try {
        await sendPasswordResetEmail(user, resetToken);
        logger.info(`Password reset email sent to: ${email}`);
      } catch (emailError) {
        logger.error('Error sending password reset email:', emailError);
        throw new Error('Gagal mengirim email reset password');
      }
    } catch (error: any) {
      logger.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+resetPasswordToken +resetPasswordExpires');

      if (!user) {
        throw new Error('Token reset password tidak valid atau sudah kedaluwarsa');
      }

      // Update password
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Invalidate all sessions
      await redisClient.deleteSession(`refresh_token:${user._id}`);

      logger.info(`Password reset successful for user: ${user.email}`);
    } catch (error: any) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await User.findById(userId).select('+password');

      if (!user) {
        throw new Error('User tidak ditemukan');
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new Error('Password saat ini salah');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Invalidate all sessions
      await redisClient.deleteSession(`refresh_token:${user._id}`);

      logger.info(`Password changed for user: ${user.email}`);
    } catch (error: any) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        throw new Error('User tidak ditemukan');
      }

      if (user.emailVerified) {
        throw new Error('Email sudah diverifikasi');
      }

      // Generate new verification token
      const verificationToken = generateToken();
      user.verificationToken = verificationToken;
      await user.save();

      // Send verification email
      await sendVerificationEmail(user, verificationToken);

      logger.info(`Verification email resent to: ${email}`);
    } catch (error: any) {
      logger.error('Resend verification email error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error: any) {
      logger.error('Get user by ID error:', error);
      throw error;
    }
  }
}

export default new AuthService();
