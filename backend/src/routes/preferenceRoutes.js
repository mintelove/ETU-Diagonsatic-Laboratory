import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { preferenceSchema, updatePreferences } from '../controllers/preferenceController.js';
const router = Router();
router.patch('/', requireAuth, validate(preferenceSchema), updatePreferences);
export default router;
