import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { sendSuccess, sendError, sendCreated } from '../utils/response';
import logger from '../utils/logger';

/**
 * Register new user
 */
export const register = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { 
      email, 
      password, 
      fullName, 
      role, 
      phone, 
      nim, 
      prodi, 
      angkatan, 
      organizationName, 
      organizationDescription 
    } = req.body;

    const result = await authService.register({
      email,
      password,
      fullName,
      role,
      phone,
      nim,
      prodi,
      angkatan,
      organizationName,
      organizationDescription,
    });

    sendCreated(res, 'Registrasi berhasil. Silakan cek email untuk verifikasi.', { 
      user: {
        _id: result.user._id,
        email: result.user.email,
        profile: result.user.profile,
        role: result.user.role,
        accountType: result.user.accountType,
      }
    });
  } catch (error: any) {
    logger.error('Register error:', error);
    sendError(res, error.message || 'Registrasi gagal', 400);
  }
};

/**
 * Verify email
 */
export const verifyEmail = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { token } = req.body;

    await authService.verifyEmail(token);

    sendSuccess(res, 'Email berhasil diverifikasi', null);
  } catch (error: any) {
    logger.error('Verify email error:', error);
    sendError(res, error.message || 'Verifikasi email gagal', 400);
  }
};

/**
 * Resend verification email
 */
export const resendVerification = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    await authService.resendVerificationEmail(email);

    sendSuccess(res, 'Email verifikasi telah dikirim ulang', null);
  } catch (error: any) {
    logger.error('Resend verification error:', error);
    sendError(res, error.message || 'Gagal mengirim ulang email verifikasi', 400);
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    sendSuccess(res, 'Login berhasil', result);
  } catch (error: any) {
    logger.error('Login error:', error);
    sendError(res, error.message || 'Login gagal', 401);
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    const result = await authService.refreshToken(refreshToken);

    sendSuccess(res, 'Token berhasil diperbarui', result);
  } catch (error: any) {
    logger.error('Refresh token error:', error);
    sendError(res, error.message || 'Gagal memperbarui token', 401);
  }
};

/**
 * Logout user
 */
export const logout = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (userId) {
      await authService.logout(userId);
    }

    sendSuccess(res, 'Logout berhasil', null);
  } catch (error: any) {
    logger.error('Logout error:', error);
    sendError(res, error.message || 'Logout gagal', 400);
  }
};

/**
 * Request password reset
 */
export const forgotPassword = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    await authService.forgotPassword(email);

    sendSuccess(res, 'Email reset password telah dikirim', null);
  } catch (error: any) {
    logger.error('Forgot password error:', error);
    sendError(res, error.message || 'Gagal mengirim email reset password', 400);
  }
};

/**
 * Reset password
 */
export const resetPassword = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    await authService.resetPassword(token, newPassword);

    sendSuccess(res, 'Password berhasil direset', null);
  } catch (error: any) {
    logger.error('Reset password error:', error);
    sendError(res, error.message || 'Reset password gagal', 400);
  }
};

/**
 * Change password (authenticated user)
 */
export const changePassword = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    await authService.changePassword(userId, currentPassword, newPassword);

    sendSuccess(res, 'Password berhasil diubah', null);
  } catch (error: any) {
    logger.error('Change password error:', error);
    sendError(res, error.message || 'Gagal mengubah password', 400);
  }
};

/**
 * Get current user profile
 */
export const getMe = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const user = await authService.getUserById(userId);

    if (!user) {
      sendError(res, 'User tidak ditemukan', 404);
      return;
    }

    sendSuccess(res, 'Data user berhasil diambil', user);
  } catch (error: any) {
    logger.error('Get me error:', error);
    sendError(res, error.message || 'Gagal mengambil data user', 400);
  }
};
