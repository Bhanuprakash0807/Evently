import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // Common fields
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['participant', 'organizer', 'admin'], required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    mustChangePassword: { type: Boolean, default: false },
    archivedAt: { type: Date },

    // Participant fields
    participantType: { type: String, enum: ['iiit', 'non-iiit'], default: 'non-iiit' },
    collegeOrgName: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    isIIIT: { type: Boolean, default: false },
    instituteName: { type: String, trim: true },
    interests: { type: [{ type: String, trim: true }], default: [] },
    followedOrganizers: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },

    // Organizer fields
    organizerProfile: {
      category: { type: String, trim: true },
      description: { type: String, trim: true },
      contactEmail: { type: String, trim: true },
      contactNumber: { type: String, trim: true },
      webhookUrl: { type: String, trim: true },
      discordWebhookUrl: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
