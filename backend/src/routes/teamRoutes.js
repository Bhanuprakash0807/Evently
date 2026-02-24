import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createTeam, joinTeam, registerTeam, getMyTeam, getEventTeams } from '../controllers/teamController.js';

const createTeamSchema = Joi.object({
  teamName: Joi.string().min(2).max(80).required(),
  teamSizeLimit: Joi.number().integer().min(2).max(20).required(),
});

const joinTeamSchema = Joi.object({
  inviteCode: Joi.string().required(),
});

const registerTeamSchema = Joi.object({
  responses: Joi.array().items(
    Joi.object({ label: Joi.string().required(), value: Joi.any() })
  ).default([]),
});

const router = Router();
router.use(authMiddleware);

router.post('/event/:eventId/create', requireRole(['participant']), validateBody(createTeamSchema), createTeam);
router.post('/join', requireRole(['participant']), validateBody(joinTeamSchema), joinTeam);
router.post('/:teamId/register', requireRole(['participant']), validateBody(registerTeamSchema), registerTeam);
router.get('/event/:eventId/my', requireRole(['participant']), getMyTeam);
router.get('/event/:eventId/all', requireRole(['organizer', 'admin']), getEventTeams);

export default router;
