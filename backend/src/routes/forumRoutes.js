import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { getMessages, postMessage, deleteMessage, pinMessage, reactToMessage } from '../controllers/forumController.js';

const postSchema = Joi.object({
  message: Joi.string().min(1).max(2000).required(),
  parentId: Joi.string().allow('', null),
  type: Joi.string().valid('message', 'announcement').optional(),
});

const reactionSchema = Joi.object({
  emoji: Joi.string().valid('👍', '🎉', '❤️', '❓').required(),
});

const router = Router();
router.use(authMiddleware);

router.get('/:eventId', getMessages);
router.post('/:eventId', requireRole(['participant', 'organizer', 'admin']), validateBody(postSchema), postMessage);
router.delete('/message/:msgId', requireRole(['organizer', 'admin']), deleteMessage);
router.patch('/message/:msgId/pin', requireRole(['organizer', 'admin']), pinMessage);
router.post('/message/:msgId/react', requireRole(['participant', 'organizer', 'admin']), validateBody(reactionSchema), reactToMessage);

export default router;
