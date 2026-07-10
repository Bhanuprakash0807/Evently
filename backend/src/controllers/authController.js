import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PasswordResetRequest from '../models/PasswordResetRequest.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRES_IN = '7d';
// Accepts local or local.local @ optional-subdomain iiit.ac.in
// Examples: john@iiit.ac.in, a.b@iiit.ac.in, a.b@cs.iiit.ac.in
const IIIT_EMAIL_REGEX = /^[^@\s]+(?:\.[^@\s]+)?@(?:[^@\s]+\.)?iiit\.ac\.in$/i;
const isStrictIIITEmail = (email) => IIIT_EMAIL_REGEX.test(email?.trim());

const signToken = (userId, role) =>
  jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const splitName = (raw) => {
  const parts = (raw || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(' ') };
};

const serializeUser = (user) => ({
  id: user.id,
  name: user.name,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  participantType: user.participantType,
  isIIIT: user.isIIIT,
  instituteName: user.instituteName,
  collegeOrgName: user.collegeOrgName,
  contactNumber: user.contactNumber,
  interests: user.interests || [],
  followedOrganizers: user.followedOrganizers || [],
  organizerProfile: user.organizerProfile,
  mustChangePassword: user.mustChangePassword,
});

export const registerParticipant = async (req, res) => {
  const {
    firstName: providedFirstName,
    lastName: providedLastName,
    name,
    email,
    password,
    instituteName,
    isIIIT,
    collegeOrgName,
    contactNumber,
    participantType,
    interests,
    followedOrganizers,
  } = req.body || {};

  const { firstName, lastName } = splitName(`${providedFirstName || ''} ${providedLastName || ''} ${name || ''}`);

  if (!firstName || !email || !password) {
    return res.status(400).json({ message: 'First name, email, and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const type = participantType === 'iiit' ? 'iiit' : 'non-iiit';
  const enforceIIIT = isIIIT || type === 'iiit';
  if (enforceIIIT && !isStrictIIITEmail(normalizedEmail)) {
    return res.status(400).json({ message: 'IIIT participants must use @iiit.ac.in email (subdomain optional)' });
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName?.trim(),
    name: `${firstName.trim()}${lastName ? ' ' + lastName.trim() : ''}`,
    email: normalizedEmail,
    passwordHash,
    role: 'participant',
    participantType: type,
    isIIIT: Boolean(enforceIIIT),
    instituteName: instituteName?.trim(),
    collegeOrgName: collegeOrgName?.trim(),
    contactNumber: contactNumber?.trim(),
    interests: Array.isArray(interests) ? interests : [],
    followedOrganizers: Array.isArray(followedOrganizers) ? followedOrganizers : [],
  });

  const token = signToken(user.id, user.role);
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return res.status(201).json({ user: serializeUser(user), token });
};

export const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  if (user.isDeleted) {
    return res.status(403).json({ message: 'Account is deleted' });
  }
  if (user.isActive === false) {
    return res.status(403).json({ message: 'Account is disabled' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user.id, user.role);
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return res.json({ user: serializeUser(user), token });
};

export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Invalid password change request' });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const match = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!match) return res.status(400).json({ message: 'Old password is incorrect' });

  if (newPassword.length < 6 || !/[0-9]/.test(newPassword) || !/[A-Za-z]/.test(newPassword)) {
    return res.status(400).json({ message: 'Password must be at least 6 chars and include letters and numbers' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  await user.save();

  const token = signToken(user.id, user.role);
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({ message: 'Password updated', user: serializeUser(user), token });
};

export const logout = async (_req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out' });
};

export const me = async (req, res) => {
  return res.json({ user: serializeUser(req.user) });
};

/**
 * POST /auth/organizer-forgot-password  (public — no auth required)
 * Allows an organizer to request an admin-mediated password reset while logged out.
 * Anti-enumeration: always returns 200 for non-existent / non-organizer emails.
 */
export const forgotOrganizerPassword = async (req, res) => {
  const { email, reason } = req.body || {};
  const genericOk = {
    message: 'If a matching organizer account exists, your request has been submitted for admin review.',
  };

  try {
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    // Silently succeed for non-existent / non-organizer / inactive accounts (anti-enumeration)
    if (!user || user.role !== 'organizer' || user.isDeleted || !user.isActive) {
      return res.status(200).json(genericOk);
    }

    // Reject duplicate pending requests
    const existing = await PasswordResetRequest.findOne({ organizerId: user.id, status: 'pending' });
    if (existing) {
      return res.status(400).json({
        message: 'A reset request is already pending for this account. Please wait for admin review.',
      });
    }

    await PasswordResetRequest.create({
      organizerId: user.id,
      reason: reason?.trim() || 'Forgot password (self-service)',
      status: 'pending',
    });

    return res.status(200).json(genericOk);
  } catch (_err) {
    return res.status(500).json({ message: 'Failed to submit request. Please try again.' });
  }
};
