import bcrypt from 'bcrypt';
import User from '../models/User.js';

export const updateParticipantProfile = async (req, res) => {
  if (!req.user || req.user.role !== 'participant') {
    return res.status(403).json({ message: 'Participant only' });
  }
  const { firstName, lastName, collegeOrgName, contactNumber, interests, followedOrganizers } =
    req.body || {};

  if (firstName) req.user.firstName = firstName.trim();
  if (lastName) req.user.lastName = lastName.trim();
  if (collegeOrgName) req.user.collegeOrgName = collegeOrgName.trim();
  if (contactNumber) req.user.contactNumber = contactNumber.trim();
  if (Array.isArray(interests)) {
    const seen = new Set();
    const cleaned = [];
    interests
      .map((i) => (i || '').trim())
      .filter(Boolean)
      .forEach((i) => {
        const key = i.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          cleaned.push(i);
        }
      });
    req.user.interests = cleaned;
  }
  if (Array.isArray(followedOrganizers)) {
    const uniqueFollows = [...new Set(followedOrganizers.map((id) => String(id)))] ;
    req.user.followedOrganizers = uniqueFollows;
  }
  req.user.name = `${req.user.firstName || ''}${req.user.lastName ? ' ' + req.user.lastName : ''}`.trim() ||
    req.user.name;
  await req.user.save();
  res.json({ user: req.user });
};

export const updateOrganizerProfile = async (req, res) => {
  if (!req.user || req.user.role !== 'organizer') {
    return res.status(403).json({ message: 'Organizer only' });
  }
  const { name, category, description, contactEmail, contactNumber, webhookUrl, discordWebhookUrl } = req.body || {};
  if (name) {
    req.user.name = name.trim();
  }
  req.user.organizerProfile = {
    ...req.user.organizerProfile,
    category: category?.trim() || req.user.organizerProfile?.category,
    description: description?.trim() || req.user.organizerProfile?.description,
    contactEmail: contactEmail?.trim() || req.user.organizerProfile?.contactEmail || req.user.email,
    contactNumber: contactNumber?.trim() || req.user.organizerProfile?.contactNumber,
    webhookUrl: webhookUrl?.trim() || req.user.organizerProfile?.webhookUrl,
    discordWebhookUrl: discordWebhookUrl?.trim() || req.user.organizerProfile?.discordWebhookUrl,
  };
  await req.user.save();
  res.json({ user: req.user });
};

export const followOrganizer = async (req, res) => {
  if (!req.user || req.user.role !== 'participant') {
    return res.status(403).json({ message: 'Participant only' });
  }
  const { id } = req.params;
  const organizer = await User.findById(id);
  if (!organizer || organizer.role !== 'organizer') {
    return res.status(404).json({ message: 'Organizer not found' });
  }
  const exists = req.user.followedOrganizers?.some((o) => String(o) === String(id));
  if (!exists) {
    req.user.followedOrganizers.push(id);
    await req.user.save();
  }
  res.json({ followedOrganizers: req.user.followedOrganizers });
};

export const unfollowOrganizer = async (req, res) => {
  if (!req.user || req.user.role !== 'participant') {
    return res.status(403).json({ message: 'Participant only' });
  }
  const { id } = req.params;
  req.user.followedOrganizers = (req.user.followedOrganizers || []).filter(
    (o) => String(o) !== String(id)
  );
  await req.user.save();
  res.json({ followedOrganizers: req.user.followedOrganizers });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new passwords are required' });
  }
  const user = await User.findById(req.user.id);
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Password updated' });
};
