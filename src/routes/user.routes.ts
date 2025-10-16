import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User profile
router.get('/profile/:userId', userController.getUserProfile);
router.put('/profile', userController.updateProfile);
router.post('/avatar', userController.uploadAvatar);

// Notification preferences
router.put('/preferences/notifications', userController.updateNotificationPreferences);

// Organization info (organization role only)
router.put('/organization', userController.updateOrganizationInfo);

// User statistics
router.get('/statistics', userController.getUserStatistics);

// Delete account
router.delete('/account', userController.deleteAccount);

export default router;
