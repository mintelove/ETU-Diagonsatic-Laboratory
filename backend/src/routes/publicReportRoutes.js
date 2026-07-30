import { Router } from 'express';
import { viewPublicReport, downloadPublicPdf } from '../controllers/publicReportController.js';

const router = Router();

// Public unauthenticated routes — NO authentication required
router.get('/reports/:token', viewPublicReport);
router.get('/reports/:token/pdf', downloadPublicPdf);
router.get('/:token', viewPublicReport);
router.get('/:token/pdf', downloadPublicPdf);

export default router;
