import mongoose from 'mongoose';

const passwordResetRequestSchema = new mongoose.Schema(
  {
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminComment: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
