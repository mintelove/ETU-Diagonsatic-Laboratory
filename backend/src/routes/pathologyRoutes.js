import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import * as c from '../controllers/pathologyController.js';

const router = Router();

router.use(requireAuth);

// Work queue & case examination routes
router.get('/queue', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.PATHOLOGIST, ROLES.RECEPTION), c.queue);
router.get('/cases/:id', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.PATHOLOGIST, ROLES.RECEPTION), c.getCase);
router.patch('/cases/:id/draft', allowRoles(ROLES.ADMIN, ROLES.PATHOLOGIST), c.saveDraft);
router.post('/cases/:id/approve', allowRoles(ROLES.ADMIN, ROLES.PATHOLOGIST), c.approveCase);

// Catalog / Price management routes (Sub Admin can only read; Admin can mutate)
router.get('/catalog', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.PATHOLOGIST, ROLES.RECEPTION), c.getCatalog);
router.put('/catalog/:id/price', allowRoles(ROLES.ADMIN), c.updateTestPrice);
router.post('/catalog', allowRoles(ROLES.ADMIN), c.createTest);
router.delete('/catalog/:id', allowRoles(ROLES.ADMIN), c.deleteTest);

export default router;
