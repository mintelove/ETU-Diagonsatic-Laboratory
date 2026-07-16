/**
 * ETU Diagnostic Laboratory — Category Management Controller
 *
 * Handles CRUD operations for stock categories, ensuring unique constraints,
 * preventing deletion of categories with linked stock items, and tracking creation metadata.
 */

import Category from '../models/Category.js';
import StockItem from '../models/StockItem.js';
import { AppError } from '../utils/appError.js';

/**
 * GET /api/categories — List all categories, sorted alphabetically by name.
 * Includes aggregated item counts and populated creator information.
 */
export async function listCategories(req, res, next) {
  try {
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: 'stockitems', // MongoDB collection name for StockItem
          localField: '_id',
          foreignField: 'category',
          as: 'items',
        },
      },
      {
        $project: {
          _id: 1,
          categoryName: 1,
          categoryCode: 1,
          description: 1,
          status: 1,
          name: 1,
          createdBy: 1,
          createdDate: 1,
          updatedDate: 1,
          itemCount: { $size: '$items' },
        },
      },
      { $sort: { categoryName: 1 } },
    ]);

    const populatedCategories = await Category.populate(categories, {
      path: 'createdBy',
      select: 'fullName username role',
    });

    res.json({ categories: populatedCategories });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/categories/:id — Fetch a single category by ID.
 */
export async function getCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id).populate('createdBy', 'fullName username role');
    if (!category) throw new AppError('Category not found.', 404);
    res.json({ category });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/categories — Create a new category.
 */
export async function createCategory(req, res, next) {
  try {
    const { categoryName, categoryCode, description, status } = req.body;

    // Check for duplicate category name
    const existingName = await Category.findOne({
      categoryName: { $regex: new RegExp(`^${categoryName.trim()}$`, 'i') },
    });
    if (existingName) throw new AppError('A category with this name already exists.', 409);

    // Check for duplicate category code if manual code is provided
    if (categoryCode && categoryCode.trim()) {
      const existingCode = await Category.findOne({
        categoryCode: { $regex: new RegExp(`^${categoryCode.trim()}$`, 'i') },
      });
      if (existingCode) throw new AppError('A category with this code already exists.', 409);
    }

    const category = await Category.create({
      categoryName: categoryName.trim(),
      categoryCode: categoryCode ? categoryCode.trim().toUpperCase() : undefined,
      description: description?.trim(),
      status: status || 'Active',
      createdBy: req.user.id,
    });

    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/categories/:id — Update category details.
 */
export async function updateCategory(req, res, next) {
  try {
    const { categoryName, categoryCode, description } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError('Category not found.', 404);

    // Check for duplicate category name on other categories
    const existingName = await Category.findOne({
      _id: { $ne: req.params.id },
      categoryName: { $regex: new RegExp(`^${categoryName.trim()}$`, 'i') },
    });
    if (existingName) throw new AppError('A category with this name already exists.', 409);

    // Check for duplicate category code on other categories
    const existingCode = await Category.findOne({
      _id: { $ne: req.params.id },
      categoryCode: { $regex: new RegExp(`^${categoryCode.trim()}$`, 'i') },
    });
    if (existingCode) throw new AppError('A category with this code already exists.', 409);

    category.categoryName = categoryName.trim();
    category.categoryCode = categoryCode.trim().toUpperCase();
    category.description = description?.trim() || '';
    await category.save();

    res.json({ category });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/categories/:id/status — Activate or deactivate a category.
 */
export async function updateCategoryStatus(req, res, next) {
  try {
    const { status } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!category) throw new AppError('Category not found.', 404);
    res.json({ category });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/categories/:id — Permanently delete a category.
 * Prevents deletion if any stock items are linked to this category.
 */
export async function deleteCategory(req, res, next) {
  try {
    // Prevent deletion if category is assigned to stock items
    const hasItems = await StockItem.exists({ category: req.params.id });
    if (hasItems) {
      throw new AppError(
        'This category is assigned to stock items and cannot be deleted. Move or delete those stock items first.',
        422
      );
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) throw new AppError('Category not found.', 404);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
