import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../models/User.js';
import PasswordResetRequest from '../models/PasswordResetRequest.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';

const slugify = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

const generatePassword = () => crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);

export const createOrganizer = async (req, res) => {
  const { name, category, description, contactEmail, contactNumber } = req.body || {};
  if (!name || !category) {
    return res.status(400).json({ message: 'Name and category are required' });
  }

  const domain = process.env.ORGANIZER_EMAIL_DOMAIN || 'felicity.org';
  const slug = slugify(name) || crypto.randomBytes(4).toString('hex');
  let loginEmail = `${slug}@${domain}`;

  let existing = await User.findOne({ email: loginEmail });
  if (existing) {
    loginEmail = `${slug}-${crypto.randomBytes(3).toString('hex')}@${domain}`;
    existing = await User.findOne({ email: loginEmail });
    if (existing) {
      return res.status(409).json({ message: 'Failed to generate unique login email; try again.' });
    }
  }

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const organizer = await User.create({
    name: name.trim(),
    email: loginEmail,
    passwordHash,
    role: 'organizer',
    isActive: true,
    isDeleted: false,
    mustChangePassword: true,
    organizerProfile: {
      category: category?.trim(),
      description: description?.trim(),
      contactEmail: contactEmail?.trim() || loginEmail,
      contactNumber: contactNumber?.trim(),
    },
  });

  return res.status(201).json({
    message: 'Organizer created',
    organizer: {
      id: organizer.id,
      name: organizer.name,
      email: organizer.email,
      category: organizer.organizerProfile?.category,
      status: organizer.isActive ? 'active' : 'disabled',
    },
    credentials: {
      email: organizer.email,
      password,
    },
  });
};

export const listOrganizersAdmin = async (_req, res) => {
  const organizers = await User.find({ role: 'organizer', isDeleted: false }).sort({ createdAt: -1 });
  const mapped = organizers.map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email,
    category: o.organizerProfile?.category,
    description: o.organizerProfile?.description,
    contactEmail: o.organizerProfile?.contactEmail,
    contactNumber: o.organizerProfile?.contactNumber,
    isActive: o.isActive,
    isDeleted: o.isDeleted,
    createdAt: o.createdAt,
  }));
  res.json({ organizers: mapped });
};

export const disableOrganizer = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user || user.role !== 'organizer' || user.isDeleted) {
    return res.status(404).json({ message: 'Organizer not found' });
  }
  user.isActive = false;
  user.archivedAt = new Date();
  await user.save();
  res.json({ message: 'Organizer disabled', id });
};

export const enableOrganizer = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user || user.role !== 'organizer' || user.isDeleted) {
    return res.status(404).json({ message: 'Organizer not found' });
  }
  user.isActive = true;
  user.archivedAt = null;
  await user.save();
  res.json({ message: 'Organizer enabled', id });
};

export const deleteOrganizer = async (req, res) => {
  const { id } = req.params;
  const permanent = String(req.query?.permanent || '').toLowerCase() === 'true';
  const user = await User.findById(id);
  if (!user || user.role !== 'organizer') {
    return res.status(404).json({ message: 'Organizer not found' });
  }

  // soft delete remains default behavior
  if (!permanent) {
    user.isDeleted = true;
    user.isActive = false;
    await user.save();
    return res.json({ message: 'Organizer deleted (soft)', id });
  }

  // permanent delete: remove organizer, events, registrations, reset requests
  try {
    const events = await Event.find({ organizer: id }, '_id');
    const eventIds = events.map((e) => e._id);
    if (eventIds.length) {
      await Registration.deleteMany({ event: { $in: eventIds } });
      await Event.deleteMany({ _id: { $in: eventIds } });
    }
    await PasswordResetRequest.deleteMany({ organizerId: id });
    await User.deleteOne({ _id: id });
    return res.json({ message: 'Organizer permanently deleted', id, removedEvents: eventIds.length });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to permanently delete organizer', details: err.message });
  }
};

export const dashboardStats = async (_req, res) => {
  const [total, active, disabled, pendingRequests] = await Promise.all([
    User.countDocuments({ role: 'organizer', isDeleted: false }),
    User.countDocuments({ role: 'organizer', isDeleted: false, isActive: true }),
    User.countDocuments({ role: 'organizer', isDeleted: false, isActive: false }),
    PasswordResetRequest.countDocuments({ status: 'pending' }),
  ]);
  res.json({ total, active, disabled, pendingRequests });
};

export const getPasswordResetRequests = async (_req, res) => {
  const requests = await PasswordResetRequest.find()
    .sort({ createdAt: -1 })
    .populate('organizerId', 'name email');
  const mapped = requests.map((r) => ({
    id: r.id,
    organizerName: r.organizerId?.name,
    organizerEmail: r.organizerId?.email,
    reason: r.reason,
    status: r.status,
    adminComment: r.adminComment,
    createdAt: r.createdAt,
  }));
  res.json({ requests: mapped });
};

export const approvePasswordReset = async (req, res) => {
  const { id } = req.params;
  const request = await PasswordResetRequest.findById(id).populate('organizerId');
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

  const organizer = await User.findById(request.organizerId?._id);
  if (!organizer || organizer.role !== 'organizer' || organizer.isDeleted) {
    return res.status(404).json({ message: 'Organizer not found' });
  }

  const newPassword = generatePassword();
  organizer.passwordHash = await bcrypt.hash(newPassword, 10);
  organizer.mustChangePassword = true;
  await organizer.save();

  request.status = 'approved';
  request.adminComment = req.body?.adminComment?.trim();
  await request.save();

  res.json({
    message: 'Password reset approved',
    credentials: {
      email: organizer.email,
      password: newPassword,
    },
  });
};

export const rejectPasswordReset = async (req, res) => {
  const { id } = req.params;
  const { adminComment } = req.body || {};
  const request = await PasswordResetRequest.findById(id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });
  if (!adminComment) return res.status(400).json({ message: 'adminComment is required' });

  request.status = 'rejected';
  request.adminComment = adminComment.trim();
  await request.save();
  res.json({ message: 'Request rejected' });
};
