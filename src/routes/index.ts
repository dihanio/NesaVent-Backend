import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import eventRoutes from './event.routes';
import registrationRoutes from './registration.routes';
import checkinRoutes from './checkin.routes';
import reviewRoutes from './review.routes';
import categoryRoutes from './category.routes';
import notificationRoutes from './notification.routes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/registrations', registrationRoutes);
router.use('/checkin', checkinRoutes);
router.use('/reviews', reviewRoutes);
router.use('/categories', categoryRoutes);
router.use('/notifications', notificationRoutes);

// Health check (already in server.ts but can be here too)
router.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;
