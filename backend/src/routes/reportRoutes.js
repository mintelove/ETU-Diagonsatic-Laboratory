import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { exportCsv, exportExcel, exportPdf, getTransactionsReport } from '../controllers/reportController.js';
import { viewPublicReport, downloadPublicPdf } from '../controllers/publicReportController.js';

const router = Router();

// PUBLIC UNAUTHENTICATED ROUTES — NO requireAuth MIDDLEWARE
router.get('/public/:token', viewPublicReport);
router.get('/public/:token/pdf', downloadPublicPdf);

// PROTECTED ROUTES — REQUIRES ADMIN AUTH
router.use(requireAuth, allowRoles(ROLES.ADMIN));
router.get('/transactions', getTransactionsReport);
router.get('/stock.csv', exportCsv);
router.get('/stock.xlsx', exportExcel);
router.get('/stock.pdf', exportPdf);

export default router;
