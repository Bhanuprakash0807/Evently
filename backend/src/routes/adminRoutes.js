import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
	createOrganizer,
	listOrganizersAdmin,
	disableOrganizer,
	enableOrganizer,
	deleteOrganizer,
	dashboardStats,
	getPasswordResetRequests,
	approvePasswordReset,
	rejectPasswordReset,
} from '../controllers/adminController.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const organizerSchema = Joi.object({
	name: Joi.string().required(),
	category: Joi.string().required(),
	description: Joi.string().allow('', null),
	contactEmail: Joi.string().email().allow('', null),
	contactNumber: Joi.string().allow('', null),
});

const adminCommentSchema = Joi.object({
	adminComment: Joi.string().min(1).required(),
});

router.use(authMiddleware, requireRole(['admin']));

router.post('/organizers', validateBody(organizerSchema), createOrganizer);
router.get('/organizers', listOrganizersAdmin);
router.patch('/organizers/:id/disable', disableOrganizer);
router.patch('/organizers/:id/enable', enableOrganizer);
router.delete('/organizers/:id', deleteOrganizer);

router.get('/password-requests', getPasswordResetRequests);
router.patch('/password-requests/:id/approve', approvePasswordReset);
router.patch('/password-requests/:id/reject', validateBody(adminCommentSchema), rejectPasswordReset);

router.get('/dashboard-stats', dashboardStats);

export default router;
