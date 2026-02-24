import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
	organizerDashboardStats,
	passwordResetHistory,
	organizerParticipants,
	requestPasswordReset,
	exportParticipantsCsv,
	listPendingMerchOrders,
	approveMerchOrder,
	rejectMerchOrder,
} from '../controllers/organizerController.js';
import { validateBody } from '../middleware/validate.js';

const resetSchema = Joi.object({
	reason: Joi.string().min(3).required(),
});

const router = Router();

router.use(authMiddleware, requireRole(['organizer']));
router.post('/request-password-reset', validateBody(resetSchema), requestPasswordReset);
router.get('/password-reset-history', passwordResetHistory);
router.get('/dashboard-stats', organizerDashboardStats);
router.get('/events/:id/participants', organizerParticipants);
router.get('/events/:id/participants/export', exportParticipantsCsv);
router.get('/merch-approvals', listPendingMerchOrders);
router.patch('/merch-approvals/:regId/approve', approveMerchOrder);
router.patch('/merch-approvals/:regId/reject', rejectMerchOrder);

export default router;
