import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
	myRegistrations,
	participantCancelled,
	participantCompleted,
	participantMerchandise,
	participantUpcoming,
	purchaseMerchandise,
	registerForEvent,
	uploadPaymentProof,
} from '../controllers/registrationController.js';
import { validateBody } from '../middleware/validate.js';

const responseSchema = Joi.object({
	label: Joi.string().required(),
	value: Joi.any(),
});

const registerSchema = Joi.object({
	responses: Joi.array().items(responseSchema).default([]),
	teamName: Joi.string().allow('', null),
});

const purchaseSchema = Joi.object({
	responses: Joi.array().items(responseSchema).default([]),
	teamName: Joi.string().allow('', null),
	paymentProofUrl: Joi.string().allow('', null),
	items: Joi.array()
		.items(
			Joi.object({
				variantName: Joi.string().required(),
				quantity: Joi.number().min(1).required(),
			})
		)
		.min(1)
		.required(),
});

const router = Router();
router.use(authMiddleware);

router.get('/me/list', requireRole(['participant']), myRegistrations);
router.get('/participant/events/upcoming', requireRole(['participant']), participantUpcoming);
router.get('/participant/events/completed', requireRole(['participant']), participantCompleted);
router.get('/participant/events/cancelled', requireRole(['participant']), participantCancelled);
router.get('/participant/events/merchandise', requireRole(['participant']), participantMerchandise);
router.post('/:id/register', requireRole(['participant']), validateBody(registerSchema), registerForEvent);
router.post('/:id/purchase', requireRole(['participant']), validateBody(purchaseSchema), purchaseMerchandise);
router.patch('/:id/proof', requireRole(['participant']), uploadPaymentProof);

export default router;
