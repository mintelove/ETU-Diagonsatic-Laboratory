import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { exportCsv, exportExcel, exportPdf, getTransactionsReport } from '../controllers/reportController.js';

const router = Router();
router.use(requireAuth, allowRoles(ROLES.ADMIN));
router.get('/transactions', getTransactionsReport);
router.get('/stock.csv', exportCsv);
router.get('/stock.xlsx', exportExcel);
router.get('/stock.pdf', exportPdf);

export default router;
