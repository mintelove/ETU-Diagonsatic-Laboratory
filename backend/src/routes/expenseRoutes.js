import { Router } from 'express';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { validate } from '../middleware/validate.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  voidExpenseSchema
} from '../validators/expenseValidators.js';
import {
  createExpense,
  listExpenses,
  getExpense,
  updateExpense,
  voidExpense,
  deleteExpense,
  expenseSummary
} from '../controllers/expenseController.js';

const router = Router();

router.use(requireAuth, allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.RECEPTION));

router.get('/summary', expenseSummary);
router.get('/', listExpenses);
router.get('/:id', getExpense);
router.post('/', validate(createExpenseSchema), createExpense);
router.patch('/:id', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN), validate(updateExpenseSchema), updateExpense);
router.patch('/:id/void', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN), validate(voidExpenseSchema), voidExpense);
router.delete('/:id', allowRoles(ROLES.ADMIN), deleteExpense);

export default router;
