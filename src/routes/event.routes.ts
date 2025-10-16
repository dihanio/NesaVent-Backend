import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { authenticate, isOrganizationOrAdmin, isAdmin } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { eventCreationLimiter } from '../middlewares/rateLimit.middleware';
import { createEventSchema, updateEventSchema } from '../utils/validation';

const router = Router();

// Public routes
router.get('/', eventController.getEvents);
router.get('/slug/:slug', eventController.getEventBySlug);
router.get('/:id', eventController.getEventById);
router.get('/:id/statistics', eventController.getEventStatistics);
router.post('/:id/share', eventController.shareEvent);

// Protected routes - Organization/Admin only
router.post(
  '/',
  authenticate,
  isOrganizationOrAdmin,
  eventCreationLimiter,
  validateBody(createEventSchema),
  eventController.createEvent
);

router.put(
  '/:id',
  authenticate,
  isOrganizationOrAdmin,
  validateBody(updateEventSchema),
  eventController.updateEvent
);

router.delete('/:id', authenticate, isOrganizationOrAdmin, eventController.deleteEvent);

router.post('/:id/submit', authenticate, isOrganizationOrAdmin, eventController.submitForApproval);
router.post('/:id/cancel', authenticate, isOrganizationOrAdmin, eventController.cancelEvent);

// Organizer routes
router.get('/organizer/events', authenticate, isOrganizationOrAdmin, eventController.getOrganizerEvents);

// Admin only routes
router.post('/:id/approve', authenticate, isAdmin, eventController.approveEvent);
router.post('/:id/reject', authenticate, isAdmin, eventController.rejectEvent);
router.post('/:id/publish', authenticate, isAdmin, eventController.publishEvent);

export default router;
