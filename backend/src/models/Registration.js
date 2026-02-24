import mongoose from 'mongoose';

const purchasedItemSchema = new mongoose.Schema(
  {
    variantName: { type: String },
    size: { type: String },
    color: { type: String },
    quantity: { type: Number, min: 1, default: 1 },
    price: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const formResponseSchema = new mongoose.Schema(
  {
    label: { type: String },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    type: { type: String, enum: ['normal', 'merchandise'], required: true },
    teamName: { type: String, trim: true },
    status: {
      type: String,
      enum: ['registered', 'completed', 'cancelled', 'rejected'],
      default: 'registered',
    },
    attended: { type: Boolean, default: false },
    ticketId: { type: String, required: true, unique: true },
    qrData: { type: String },
    formResponses: [formResponseSchema],
    purchasedItems: [purchasedItemSchema],
    totalAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'approved', 'rejected'],
      default: 'paid',
    },
    paymentProofUrl: { type: String, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Registration', registrationSchema);
