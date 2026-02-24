import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
  updateParticipantProfile,
  updateOrganizerProfile,
  followOrganizer,
  unfollowOrganizer,
  changePassword,
} from '../controllers/profileController.js';
import { validateBody } from '../middleware/validate.js';

const participantProfileSchema = Joi.object({
  firstName: Joi.string().allow('', null),
  lastName: Joi.string().allow('', null),
  collegeOrgName: Joi.string().allow('', null),
  contactNumber: Joi.string().allow('', null),
  interests: Joi.array().items(Joi.string()),
  followedOrganizers: Joi.array().items(Joi.string()),
});

const organizerProfileSchema = Joi.object({
  name: Joi.string().allow('', null),
  category: Joi.string().allow('', null),
  description: Joi.string().allow('', null),
  contactEmail: Joi.string().email().allow('', null),
  contactNumber: Joi.string().allow('', null),
  webhookUrl: Joi.string().uri().allow('', null),
  discordWebhookUrl: Joi.string().uri().allow('', null),
});

const profileChangePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(8).required(),
  newPassword: Joi.string().min(8).required(),
});

const router = Router();
router.use(authMiddleware);

router.patch('/participant', requireRole(['participant']), validateBody(participantProfileSchema), updateParticipantProfile);
router.patch('/organizer', requireRole(['organizer']), validateBody(organizerProfileSchema), updateOrganizerProfile);
router.post('/follow/:id', requireRole(['participant']), followOrganizer);
router.post('/unfollow/:id', requireRole(['participant']), unfollowOrganizer);
router.post('/change-password', validateBody(profileChangePasswordSchema), changePassword);

export default router;
