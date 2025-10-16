import { Router } from 'express';
import * as registrationController from '../controllers/registration.controller';
import { authenticate, isOrganizationOrAdmin } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { registrationLimiter } from '../middlewares/rateLimit.middleware';
import { createRegistrationSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes
router.post('/', registrationLimiter, validateBody(createRegistrationSchema), registrationController.createRegistration);
router.get('/my-registrations', registrationController.getUserRegistrations);
router.get('/:id', registrationController.getRegistrationById);
router.get('/:id/download', registrationController.downloadTicket);
router.post('/:id/cancel', registrationController.cancelRegistration);

// Organizer routes
router.get('/event/:eventId', isOrganizationOrAdmin, registrationController.getEventRegistrations);
router.get('/event/:eventId/statistics', isOrganizationOrAdmin, registrationController.getRegistrationStatistics);
router.get('/event/:eventId/export', isOrganizationOrAdmin, registrationController.exportRegistrations);

export default router;
