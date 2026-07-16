import {Router} from 'express';
import {requireAuth,allowRoles} from '../middleware/auth.js';
import {ROLES} from '../constants/roles.js';
import {parameters,draft,generate} from '../controllers/reportEntryController.js';
const router=Router();router.use(requireAuth,allowRoles(ROLES.SAMPLE_COLLECTOR));router.get('/equipment',parameters);router.get('/patients/:patientId/draft',draft);router.post('/patients/:patientId/generate',generate);export default router;
