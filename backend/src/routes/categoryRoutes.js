/**
 * ETU Diagnostic Laboratory — Category Routes
 *
 * Configures endpoints for Category Management.
 * Protects writing operations with Admin-only access policies.
 */

import { Router } from 'express';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { validate } from '../middleware/validate.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryStatusSchema,
} from '../validators/categoryValidators.js';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
  updateCategoryStatus,
} from '../controllers/categoryController.js';

const router = Router();

// Require authenticated session for all operations
router.use(requireAuth);

// GET /api/categories — Accessible by Admin and Reception
router.get('/', allowRoles(ROLES.ADMIN, ROLES.RECEPTION), listCategories);

// Restrict remaining endpoints to Administrator role
router.use(allowRoles(ROLES.ADMIN));

// POST /api/categories — Create category
router.post('/', validate(createCategorySchema), createCategory);

// GET /api/categories/:id — Get details
// PUT /api/categories/:id — Update details
// DELETE /api/categories/:id — Delete category
router
  .route('/:id')
  .get(getCategory)
  .put(validate(updateCategorySchema), updateCategory)
  .delete(deleteCategory);

// PATCH /api/categories/:id/status — Activate / deactivate status
router.patch('/:id/status', validate(categoryStatusSchema), updateCategoryStatus);

export default router;
