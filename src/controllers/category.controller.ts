import { Request, Response, NextFunction } from 'express';
import Category from '../models/Category';
import { sendSuccess, sendError, sendCreated } from '../utils/response';
import logger from '../utils/logger';

/**
 * Create category (admin only)
 */
export const createCategory = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { name, slug, description, icon, color, isActive, displayOrder } = req.body;

    const category = await Category.create({
      name,
      slug,
      description,
      icon,
      color,
      isActive,
      displayOrder,
    });

    sendCreated(res, 'Category berhasil dibuat', category);
  } catch (error: any) {
    logger.error('Create category error:', error);
    sendError(res, error.message || 'Gagal membuat category', 400);
  }
};

/**
 * Get all categories
 */
export const getCategories = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { includeInactive } = req.query;

    const query = includeInactive === 'true' ? {} : { isActive: true };

    const categories = await Category.find(query).sort({ displayOrder: 1, name: 1 }).lean();

    sendSuccess(res, 'Categories berhasil diambil', categories);
  } catch (error: any) {
    logger.error('Get categories error:', error);
    sendError(res, error.message || 'Gagal mengambil categories', 400);
  }
};

/**
 * Get category by ID
 */
export const getCategoryById = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id).lean();

    if (!category) {
      sendError(res, 'Category tidak ditemukan', 404);
      return;
    }

    sendSuccess(res, 'Category berhasil diambil', category);
  } catch (error: any) {
    logger.error('Get category by ID error:', error);
    sendError(res, error.message || 'Gagal mengambil category', 400);
  }
};

/**
 * Get category by slug
 */
export const getCategoryBySlug = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug }).lean();

    if (!category) {
      sendError(res, 'Category tidak ditemukan', 404);
      return;
    }

    sendSuccess(res, 'Category berhasil diambil', category);
  } catch (error: any) {
    logger.error('Get category by slug error:', error);
    sendError(res, error.message || 'Gagal mengambil category', 400);
  }
};

/**
 * Update category (admin only)
 */
export const updateCategory = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon, color, isActive, displayOrder } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      sendError(res, 'Category tidak ditemukan', 404);
      return;
    }

    if (name !== undefined) category.name = name;
    if (slug !== undefined) category.slug = slug;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;
    if (isActive !== undefined) category.isActive = isActive;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;

    await category.save();

    sendSuccess(res, 'Category berhasil diupdate', category);
  } catch (error: any) {
    logger.error('Update category error:', error);
    sendError(res, error.message || 'Gagal mengupdate category', 400);
  }
};

/**
 * Delete category (admin only)
 */
export const deleteCategory = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if category has events
    const Event = require('../models/Event').default;
    const eventCount = await Event.countDocuments({ category: id });

    if (eventCount > 0) {
      sendError(res, `Tidak dapat menghapus category dengan ${eventCount} event`, 400);
      return;
    }

    const result = await Category.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      sendError(res, 'Category tidak ditemukan', 404);
      return;
    }

    sendSuccess(res, 'Category berhasil dihapus', null);
  } catch (error: any) {
    logger.error('Delete category error:', error);
    sendError(res, error.message || 'Gagal menghapus category', 400);
  }
};
