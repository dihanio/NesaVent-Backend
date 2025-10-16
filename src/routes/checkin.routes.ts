import { Router } from 'express';
import * as checkinController from '../controllers/checkin.controller';
import { authenticate, isOrganizationOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication and organization/admin role
router.use(authenticate, isOrganizationOrAdmin);

// Check-in routes
router.post('/process', checkinController.processCheckIn);
router.post('/bulk', checkinController.bulkCheckIn);
router.get('/event/:eventId/stats', checkinController.getCheckInStats);
router.get('/event/:eventId/list', checkinController.getCheckInList);
router.get('/validate/:registrationId', checkinController.validateRegistration);
router.post('/undo/:registrationId', checkinController.undoCheckIn);
router.get('/event/:eventId/export', checkinController.exportCheckInData);

export default router;
