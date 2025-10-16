import { Router } from 'express';
import * as reviewController from '../controllers/review.controller';
import { authenticate, isOrganization } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { createReviewSchema, updateReviewSchema } from '../utils/validation';

const router = Router();

// Public routes
router.get('/event/:eventId', reviewController.getEventReviews);
router.get('/event/:eventId/statistics', reviewController.getReviewStatistics);

// Protected routes
router.use(authenticate);

router.post('/', validateBody(createReviewSchema), reviewController.createReview);
router.put('/:id', validateBody(updateReviewSchema), reviewController.updateReview);
router.delete('/:id', reviewController.deleteReview);
router.post('/:id/helpful', reviewController.markAsHelpful);
router.get('/my-reviews', reviewController.getUserReviews);

// Organizer only
router.post('/:id/respond', isOrganization, reviewController.respondToReview);
router.get('/organizer/reviews', isOrganization, reviewController.getOrganizerReviews);

export default router;
