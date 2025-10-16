import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { authenticate, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.get('/', categoryController.getCategories);
router.get('/slug/:slug', categoryController.getCategoryBySlug);
router.get('/:id', categoryController.getCategoryById);

// Admin only routes
router.use(authenticate, isAdmin);

router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
