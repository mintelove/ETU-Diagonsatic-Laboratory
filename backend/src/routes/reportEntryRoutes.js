import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import {
  parameters,
  getCatalog,
  listAdminParameters,
  createParameter,
  updateParameter,
  deleteParameter,
  draft,
  generate
} from '../controllers/reportEntryController.js';

const router = Router();
router.use(requireAuth);

// Catalog endpoints — accessible by Sample Collector & Admin
router.get('/catalog', allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.ADMIN), getCatalog);
router.get('/equipment', allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.ADMIN), parameters);

// Patient draft & generate endpoints — Sample Collector
router.get('/patients/:patientId/draft', allowRoles(ROLES.SAMPLE_COLLECTOR), draft);
router.post('/patients/:patientId/generate', allowRoles(ROLES.SAMPLE_COLLECTOR), generate);

// Admin Parameter Management CRUD — Admin only
router.get('/admin/parameters', allowRoles(ROLES.ADMIN), listAdminParameters);
router.post('/admin/parameters', allowRoles(ROLES.ADMIN), createParameter);
router.put('/admin/parameters/:id', allowRoles(ROLES.ADMIN), updateParameter);
router.delete('/admin/parameters/:id', allowRoles(ROLES.ADMIN), deleteParameter);

export default router;
