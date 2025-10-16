import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { authLimiter, registerLimiter } from '../middlewares/rateLimit.middleware';
import { 
  registerSchema, 
  loginSchema, 
  emailSchema, 
  tokenSchema, 
  resetPasswordSchema,
  changePasswordSchema 
} from '../utils/validation';

const router = Router();

// Public routes
router.post('/register', registerLimiter, validateBody(registerSchema), authController.register);
router.post('/verify-email', validateBody(tokenSchema), authController.verifyEmail);
router.post('/resend-verification', authLimiter, validateBody(emailSchema), authController.resendVerification);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authLimiter, validateBody(emailSchema), authController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, validateBody(changePasswordSchema), authController.changePassword);
router.get('/me', authenticate, authController.getMe);

export default router;
