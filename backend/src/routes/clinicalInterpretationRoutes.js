import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import {
  getInterpretationsForTest,
  adminListInterpretations,
  createInterpretation,
  updateInterpretation,
  deleteInterpretation,
  resetLibrary
} from '../controllers/clinicalInterpretationController.js';

const router = Router();

router.use(requireAuth);

// Sample Collectors & Technicians can fetch compatible test interpretations
router.get('/', allowRoles(ROLES.ADMIN, ROLES.SAMPLE_COLLECTOR, ROLES.APPROVER), getInterpretationsForTest);

// Admin catalog management
router.get('/admin', allowRoles(ROLES.ADMIN), adminListInterpretations);
router.post('/admin/reset', allowRoles(ROLES.ADMIN), resetLibrary);
router.post('/', allowRoles(ROLES.ADMIN), createInterpretation);
router.put('/:id', allowRoles(ROLES.ADMIN), updateInterpretation);
router.delete('/:id', allowRoles(ROLES.ADMIN), deleteInterpretation);

export default router;
