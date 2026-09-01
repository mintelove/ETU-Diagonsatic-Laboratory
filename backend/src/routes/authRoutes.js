import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, me, changeUsername, changePassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, changeUsernameSchema, changePasswordSchema } from '../validators/userValidators.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many login attempts. Please try again later.' }
});

router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/me', requireAuth, me);
router.put('/change-username', requireAuth, validate(changeUsernameSchema), changeUsername);
router.patch('/change-username', requireAuth, validate(changeUsernameSchema), changeUsername);
router.put('/change-password', requireAuth, validate(changePasswordSchema), changePassword);
router.patch('/change-password', requireAuth, validate(changePasswordSchema), changePassword);

export default router;
