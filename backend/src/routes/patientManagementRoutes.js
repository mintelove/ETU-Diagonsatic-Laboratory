import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { validate } from '../middleware/validate.js';
import * as controller from '../controllers/patientManagementController.js';

const router = Router();
const hospitalSchema = z.object({
  name: z.string().trim().min(2).max(120), code: z.string().trim().max(30).optional(),
  phone: z.string().trim().max(30).optional(), email: z.string().trim().email().max(120).or(z.literal('')).optional(),
  address: z.string().trim().max(240).optional(), city: z.string().trim().max(80).optional(),
  contactPerson: z.string().trim().max(120).optional(), description: z.string().trim().max(500).optional(), active: z.boolean().optional()
});

router.use(requireAuth, allowRoles(ROLES.ADMIN));
router.get('/dashboard', controller.dashboard);
router.get('/patients', controller.patients);
router.get('/patients/:id', controller.patientProfile);
router.get('/exports/patients.:format', controller.exportPatients);
router.get('/hospitals', controller.hospitals);
router.post('/hospitals', validate(hospitalSchema), controller.createHospital);
router.put('/hospitals/:id', validate(hospitalSchema), controller.updateHospital);
router.patch('/hospitals/:id/status', validate(z.object({ active: z.boolean() })), controller.setHospitalStatus);
router.delete('/hospitals/:id', controller.deleteHospital);
export default router;
