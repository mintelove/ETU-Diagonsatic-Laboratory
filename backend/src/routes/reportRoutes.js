import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import {
  exportCsv,
  exportExcel,
  exportPdf,
  getTransactionsReport,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions
} from '../controllers/reportController.js';
import { viewPublicReport, downloadPublicPdf } from '../controllers/publicReportController.js';

const router = Router();

// PUBLIC UNAUTHENTICATED ROUTES — NO requireAuth MIDDLEWARE
router.get('/public/:token', viewPublicReport);
router.get('/public/:token/pdf', downloadPublicPdf);

// PROTECTED ROUTES
router.use(requireAuth);
router.get('/transactions', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN), getTransactionsReport);
router.post('/transactions', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN), addTransaction);
router.post('/transactions/bulk-delete', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN), bulkDeleteTransactions);
router.delete('/transactions/bulk-delete', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN), bulkDeleteTransactions);
router.delete('/transactions/bulk', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN), bulkDeleteTransactions);
router.put('/transactions/:id', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN), updateTransaction);
router.delete('/transactions/:id', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN), deleteTransaction);

router.get('/stock.csv', allowRoles(ROLES.ADMIN), exportCsv);
router.get('/stock.xlsx', allowRoles(ROLES.ADMIN), exportExcel);
router.get('/stock.pdf', allowRoles(ROLES.ADMIN), exportPdf);

export default router;
