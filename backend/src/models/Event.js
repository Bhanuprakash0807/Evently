import mongoose from 'mongoose';

const formFieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'textarea', 'number', 'select', 'checkbox', 'radio', 'file'], required: true },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
  },
  { _id: false }
);

const customFormFieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ['text', 'dropdown', 'checkbox', 'file'], required: true },
    options: [{ type: String, trim: true }],
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const merchandiseVariantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    size: { type: String },
    color: { type: String },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    purchaseLimitPerUser: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const variantGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    options: [{ type: String, trim: true }],
  },
  { _id: false }
);

const normalizeEligibility = (val) => {
  const raw = (val || '').toString().trim().toLowerCase();
  if (!raw || raw === 'both' || raw === 'any' || raw === 'all' || raw === 'open to all' || raw === 'open') return 'both';
  if (raw.startsWith('iiit')) return 'iiit';
  if (raw.startsWith('non-iiit') || raw.startsWith('non iiit')) return 'non-iiit';
  return val;
};

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['normal', 'merchandise'], required: true },
    eligibility: {
      type: String,
      enum: ['iiit', 'non-iiit', 'both'],
      default: 'both',
      set: normalizeEligibility,
    },
    registrationDeadline: {
      type: Date,
      required() {
        return this.type === 'normal';
      },
      default: null,
    },
    startDate: {
      type: Date,
      required() {
        return this.type === 'normal';
      },
      default: null,
    },
    endDate: {
      type: Date,
      required() {
        return this.type === 'normal';
      },
      default: null,
    },
    registrationLimit: {
      type: Number,
      min: 0,
      required() {
        return this.type === 'normal';
      },
      default: null,
    },
    registrationFee: {
      type: Number,
      default: 0,
      min: 0,
      required() {
        return this.type === 'normal';
      },
    },
    saleStartDate: {
      type: Date,
      required() {
        return this.type === 'merchandise';
      },
      default: null,
    },
    saleEndDate: {
      type: Date,
      required() {
        return this.type === 'merchandise';
      },
      default: null,
    },
    stock: { type: Number, min: 0, default: 0 },
    purchaseLimit: { type: Number, min: 1, default: 1 },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['draft', 'published', 'ongoing', 'completed', 'closed', 'sale-live', 'sale-ended'],
      default: 'draft',
    },
    customFormSchema: [customFormFieldSchema],
    formLocked: { type: Boolean, default: false },
    formFields: [formFieldSchema],
    merchandiseVariants: [merchandiseVariantSchema],
    variants: [variantGroupSchema],
    teamRegistration: { type: Boolean, default: false },
    maxTeamSize: { type: Number, default: null, min: 2 },
  },
  { timestamps: true }
);

export default mongoose.model('Event', eventSchema);
