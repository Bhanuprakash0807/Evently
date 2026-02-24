import mongoose from 'mongoose';
import crypto from 'crypto';

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['invited', 'joined'], default: 'joined' },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teamName: { type: String, required: true, trim: true },
    teamSizeLimit: { type: Number, required: true, min: 2 },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(5).toString('hex').toUpperCase(),
    },
    members: [memberSchema],
    status: {
      type: String,
      enum: ['forming', 'complete', 'registered'],
      default: 'forming',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Team', teamSchema);
