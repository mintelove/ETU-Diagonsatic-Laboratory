import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { exportCsv, exportExcel, exportPdf, getTransactionsReport } from '../controllers/reportController.js';
import { viewPublicReport, downloadPublicPdf } from '../controllers/publicReportController.js';

const router = Router();

// PUBLIC UNAUTHENTICATED ROUTES — NO requireAuth MIDDLEWARE
router.get('/public/:token', viewPublicReport);
router.get('/public/:token/pdf', downloadPublicPdf);

// PROTECTED ROUTES
router.use(requireAuth);
router.get('/transactions', allowRoles(ROLES.ADMIN, ROLES.SUB_ADMIN), getTransactionsReport);
router.get('/stock.csv', allowRoles(ROLES.ADMIN), exportCsv);
router.get('/stock.xlsx', allowRoles(ROLES.ADMIN), exportExcel);
router.get('/stock.pdf', allowRoles(ROLES.ADMIN), exportPdf);

export default router;
