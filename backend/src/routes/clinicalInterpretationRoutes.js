import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import {
  getInterpretationsForTest,
  adminListInterpretations,
  createInterpretation,
  updateInterpretation
} from '../controllers/clinicalInterpretationController.js';

const router = Router();

router.use(requireAuth);

// Sample Collectors & Technicians can fetch compatible test interpretations
router.get('/', allowRoles(ROLES.ADMIN, ROLES.SAMPLE_COLLECTOR, ROLES.APPROVER), getInterpretationsForTest);

// Admin catalog management
router.get('/admin', allowRoles(ROLES.ADMIN), adminListInterpretations);
router.post('/', allowRoles(ROLES.ADMIN), createInterpretation);
router.put('/:id', allowRoles(ROLES.ADMIN), updateInterpretation);

export default router;
