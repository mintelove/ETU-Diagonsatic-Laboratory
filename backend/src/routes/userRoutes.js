/**
 * ETU Diagnostic Laboratory — User Management Routes
 *
 * All routes require Admin authentication.
 * Provides CRUD, status toggle, password reset, and profile photo management.
 */

import { Router } from 'express';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  removeProfilePhoto,
  resetPassword,
  updateStatus,
  updateUser,
  uploadProfilePhoto,
} from '../controllers/userController.js';
import {
  createUserSchema,
  resetPasswordSchema,
  statusSchema,
  updateUserSchema,
} from '../validators/userValidators.js';
import { ROLES } from '../constants/roles.js';
import { uploadPhoto } from '../middleware/upload.js';

const router = Router();

// All user management routes require Admin role
router.use(requireAuth, allowRoles(ROLES.ADMIN));

// List all users / Create a new user
router.route('/').get(listUsers).post(validate(createUserSchema), createUser);

// Get / Update / Delete a single user
router
  .route('/:id')
  .get(getUser)
  .patch(validate(updateUserSchema), updateUser)
  .delete(deleteUser);

// Status toggle (activate / deactivate)
router.patch('/:id/status', validate(statusSchema), updateStatus);

// Password reset
router.patch('/:id/password', validate(resetPasswordSchema), resetPassword);

// Profile photo upload / removal
router
  .route('/:id/photo')
  .post(uploadPhoto.single('photo'), uploadProfilePhoto)
  .delete(removeProfilePhoto);

export default router;
