import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { validate } from '../middleware/validate.js';
import { reviewRequestSchema } from '../validators/collectionValidators.js';
import { listRequests, reviewRequest } from '../controllers/extraRequestController.js';

const router = Router();
router.use(requireAuth);
router.get('/', allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.ADMIN, ROLES.APPROVER), listRequests);
router.patch('/:id/review', allowRoles(ROLES.ADMIN, ROLES.APPROVER), validate(reviewRequestSchema), reviewRequest);
export default router;
