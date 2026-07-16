/**
 * ETU Diagnostic Laboratory — Sample Type Routes
 *
 * Configures endpoints for Sample Type Management.
 * Protects writing operations with Admin-only access policies.
 */

import { Router } from 'express';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { validate } from '../middleware/validate.js';
import {
  createSampleTypeSchema,
  updateSampleTypeSchema,
  sampleTypeStatusSchema,
} from '../validators/sampleTypeValidators.js';
import {
  listSampleTypes,
  getSampleType,
  createSampleType,
  updateSampleType,
  updateSampleTypeStatus,
  deleteSampleType,
} from '../controllers/sampleTypeController.js';

const router = Router();

// Require authenticated session for all operations
router.use(requireAuth);

// GET /api/sample-types — Accessible by all authenticated users (Admin, Reception, Sample Collector, Approver)
router.get('/', listSampleTypes);

// GET /api/sample-types/:id — Accessible by all authenticated users
router.get('/:id', getSampleType);

// Restrict remaining endpoints strictly to Administrator role
router.use(allowRoles(ROLES.ADMIN));

// POST /api/sample-types — Create sample type
router.post('/', validate(createSampleTypeSchema), createSampleType);

// PUT /api/sample-types/:id — Update sample type
router.put('/:id', validate(updateSampleTypeSchema), updateSampleType);

// PATCH /api/sample-types/:id/status — Activate / deactivate status
router.patch('/:id/status', validate(sampleTypeStatusSchema), updateSampleTypeStatus);

// DELETE /api/sample-types/:id — Delete sample type
router.delete('/:id', deleteSampleType);

export default router;
