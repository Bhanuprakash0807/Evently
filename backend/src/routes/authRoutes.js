import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { verifyCaptcha } from '../middleware/captcha.js';
import { login, logout, me, registerParticipant, changePassword, forgotOrganizerPassword } from '../controllers/authController.js';

const passwordRule = Joi.string().min(8).pattern(/[0-9]/).pattern(/[A-Za-z]/);
const participantSchema = Joi.object({
	firstName: Joi.string().min(1).required(),
	lastName: Joi.string().allow('', null),
	name: Joi.string().allow('', null),
	email: Joi.string().email().required(),
	password: passwordRule.required(),
	instituteName: Joi.string().allow('', null),
	isIIIT: Joi.boolean(),
	collegeOrgName: Joi.string().allow('', null),
	contactNumber: Joi.string().allow('', null),
	participantType: Joi.string().valid('iiit', 'non-iiit').allow(null),
	interests: Joi.array().items(Joi.string()),
	followedOrganizers: Joi.array().items(Joi.string()),
	captchaToken: Joi.string().allow('', null),
});

const loginSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().min(1).required(),
	captchaToken: Joi.string().allow('', null),
});

const changePasswordSchema = Joi.object({
	oldPassword: Joi.string().required(),
	newPassword: Joi.string().min(6).required(),
	confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
});

const validateChangePassword = (req, res, next) => {
	const { error, value } = changePasswordSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
	if (error) {
		const hasMismatch = error.details.some((d) => d.context?.key === 'confirmPassword');
		return res.status(400).json({
			message: hasMismatch ? 'New passwords do not match' : 'Invalid password change request',
			details: error.details.map((d) => d.message),
		});
	}
	req.body = { oldPassword: value.oldPassword, newPassword: value.newPassword };
	return next();
};

const forgotPasswordSchema = Joi.object({
	email: Joi.string().email().required(),
	reason: Joi.string().min(3).max(500).allow('', null),
});

const router = Router();

router.post('/register-participant', validateBody(participantSchema), verifyCaptcha, registerParticipant);
router.post('/login', validateBody(loginSchema), verifyCaptcha, login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);
router.patch('/change-password', authMiddleware, validateChangePassword, changePassword);
router.post('/organizer-forgot-password', validateBody(forgotPasswordSchema), forgotOrganizerPassword);

export default router;
