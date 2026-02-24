import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { checkEventEditPermission } from '../middleware/checkEventEditPermission.js';
import { validateBody } from '../middleware/validate.js';
import {
  createEvent,
  updateEvent,
  publishEvent,
  closeEvent,
  completeEvent,
  getEvents,
  getTrendingEvents,
  getEventById,
  organizerEvents,
  listOrganizers,
  organizerDetail,
  organizerEventAdmin,
  exportRegistrationsCsv,
} from '../controllers/eventController.js';

const router = Router();

const formFieldSchema = Joi.object({
  label: Joi.string().required(),
  type: Joi.string().valid('text', 'dropdown', 'checkbox', 'file').required(),
  options: Joi.array().items(Joi.string()).default([]),
  required: Joi.boolean().default(false),
});

const variantGroupSchema = Joi.object({
  name: Joi.string().required(),
  options: Joi.array().items(Joi.string().trim()).default([]),
});

const baseEventSchema = {
  name: Joi.string().required(),
  description: Joi.string().required(),
  type: Joi.string().valid('normal', 'merchandise').required(),
  eligibility: Joi.string().valid('iiit', 'non-iiit', 'both').default('both'),
  registrationDeadline: Joi.date().iso().allow(null),
  startDate: Joi.date().iso().allow(null),
  endDate: Joi.date().iso().allow(null),
  saleStartDate: Joi.date().iso().allow(null),
  saleEndDate: Joi.date().iso().allow(null),
  registrationLimit: Joi.number().min(0).allow(null),
  registrationFee: Joi.number().min(0).allow(null),
  stock: Joi.number().min(0).allow(null),
  purchaseLimit: Joi.number().min(1).allow(null),
  tags: Joi.array().items(Joi.string()),
  customFormSchema: Joi.array().items(formFieldSchema),
  merchandiseVariants: Joi.array().items(Joi.any()),
  variants: Joi.array().items(variantGroupSchema),
  teamRegistration: Joi.boolean().default(false),
  maxTeamSize: Joi.number().min(2).allow(null),
};

const createEventSchema = Joi.object(baseEventSchema).when(Joi.object({ type: Joi.valid('normal') }).unknown(), {
  then: Joi.object({
    registrationDeadline: Joi.date().iso().required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().required(),
    registrationLimit: Joi.number().min(0).required(),
    registrationFee: Joi.number().min(0).required(),
    stock: Joi.any().forbidden(),
    purchaseLimit: Joi.any().forbidden(),
    saleStartDate: Joi.any().forbidden(),
    saleEndDate: Joi.any().forbidden(),
    variants: Joi.array().items(variantGroupSchema).default([]),
  }),
  otherwise: Joi.object({
    stock: Joi.number().min(0).required(),
    purchaseLimit: Joi.number().min(1).required(),
    saleStartDate: Joi.date().iso().required(),
    saleEndDate: Joi.date().iso().required(),
    variants: Joi.array().items(variantGroupSchema).required(),
    registrationDeadline: Joi.date().iso().allow(null),
    startDate: Joi.date().iso().allow(null),
    endDate: Joi.date().iso().allow(null),
    registrationLimit: Joi.number().min(0).allow(null),
    registrationFee: Joi.number().min(0).allow(null),
  }),
});
const updateEventSchema = Joi.object(baseEventSchema)
  .fork(Object.keys(baseEventSchema), (schema) => schema.optional())
  .when(Joi.object({ type: Joi.valid('normal') }).unknown(), {
    then: Joi.object({
      stock: Joi.any().forbidden(),
      purchaseLimit: Joi.any().forbidden(),
      saleStartDate: Joi.any().forbidden(),
      saleEndDate: Joi.any().forbidden(),
    }),
  })
  .when(Joi.object({ type: Joi.valid('merchandise') }).unknown(), {
    then: Joi.object({
      stock: Joi.number().min(0),
      purchaseLimit: Joi.number().min(1),
      saleStartDate: Joi.date().iso(),
      saleEndDate: Joi.date().iso(),
      variants: Joi.array().items(variantGroupSchema),
    }),
  });

// public lists require auth per app policy
router.use(authMiddleware);

router.get('/organizers', listOrganizers);
router.get('/organizers/:id', organizerDetail);
router.get('/trending', getTrendingEvents);
router.get('/', getEvents);
router.get('/me/mine', requireRole(['organizer']), organizerEvents);
router.get('/:id/organizer', requireRole(['organizer']), organizerEventAdmin);
router.get('/:id/registrations/csv', requireRole(['organizer']), exportRegistrationsCsv);
router.get('/:id', getEventById);

// organizer-only
router.post('/', requireRole(['organizer']), validateBody(createEventSchema), createEvent);
router.patch('/:id', requireRole(['organizer']), checkEventEditPermission, validateBody(updateEventSchema), updateEvent);
router.post('/:id/publish', requireRole(['organizer']), publishEvent);
router.post('/:id/close', requireRole(['organizer']), closeEvent);
router.post('/:id/complete', requireRole(['organizer']), completeEvent);

export default router;
