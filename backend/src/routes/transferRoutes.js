import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import * as transferController from '../controllers/transferController.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.ADMIN, ROLES.RECEPTION),
  transferController.createTransfer
);

router.get(
  '/',
  allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.APPROVER, ROLES.ADMIN, ROLES.RECEPTION),
  transferController.getTransfers
);

router.get(
  '/cleared',
  allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.APPROVER, ROLES.ADMIN),
  transferController.getClearedTransfers
);

router.post(
  '/:id/receive',
  allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.ADMIN),
  transferController.receiveTransfer
);

router.post(
  '/:id/investigate',
  allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.ADMIN),
  transferController.startInvestigation
);

router.post(
  '/:id/send-result',
  allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.ADMIN),
  transferController.sendResultDirect
);

router.post(
  '/:id/send-back',
  allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.APPROVER, ROLES.ADMIN),
  transferController.sendResultBack
);

router.post(
  '/:id/clear',
  allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.ADMIN),
  transferController.clearTransfer
);

router.post(
  '/:id/restore',
  allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.ADMIN),
  transferController.restoreTransfer
);

router.post(
  '/:id/cancel',
  allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.ADMIN),
  transferController.cancelTransfer
);

router.get(
  '/:id/audit',
  allowRoles(ROLES.SAMPLE_COLLECTOR, ROLES.APPROVER, ROLES.ADMIN, ROLES.RECEPTION),
  transferController.getTransferAudit
);

export default router;
