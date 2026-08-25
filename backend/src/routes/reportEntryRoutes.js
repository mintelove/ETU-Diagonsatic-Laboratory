import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import {
  parameters,
  catalog,
  draft,
  generate,
  getAllParameters,
  createParameter,
  updateParameter,
  restoreParameter,
  deleteParameter
} from '../controllers/reportEntryController.js';

const router = Router();
router.use(requireAuth);

// Collector / Admin shared endpoints
router.get('/equipment', allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.ADMIN), parameters);
router.get('/catalog', allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.ADMIN, ROLES.RECEPTION, ROLES.APPROVER), catalog);
router.get('/patients/:patientId/draft', allowRoles(ROLES.SAMPLE_COLLECTOR), draft);
router.post('/patients/:patientId/generate', allowRoles(ROLES.SAMPLE_COLLECTOR), generate);

// Admin parameter catalog management — Sample Collectors can create (not update/delete)
router.get('/parameters', allowRoles(ROLES.ADMIN), getAllParameters);
router.post('/parameters', allowRoles(ROLES.ADMIN, ROLES.SAMPLE_COLLECTOR), createParameter);
router.put('/parameters/:id', allowRoles(ROLES.ADMIN), updateParameter);
router.post('/parameters/:id/restore', allowRoles(ROLES.ADMIN), restoreParameter);
router.delete('/parameters/:id', allowRoles(ROLES.ADMIN), deleteParameter);


export default router;
