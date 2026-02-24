import EventMessage from '../models/EventMessage.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import { getIo } from '../utils/socket.js';

const ALLOWED_REACTIONS = ['👍', '🎉', '❤️', '❓'];

const ensureForumAccess = async (eventDoc, user) => {
  if (!eventDoc) return 'Event not found';

  if (user.role === 'participant') {
    const reg = await Registration.findOne({ event: eventDoc._id, user: user.id });
    if (!reg) return 'You must be registered for this event to participate in the forum';
  } else if (user.role === 'organizer') {
    if (String(eventDoc.organizer) !== String(user.id)) {
      return 'You can only moderate forums for your own events';
    }
  }

  return null;
};

/**
 * GET /api/forum/:eventId
 * Load message history for an event.
 */
export const getMessages = async (req, res) => {
  const { eventId } = req.params;
  const messages = await EventMessage.find({ event: eventId, isDeleted: false })
    .populate('user', 'name role')
    .sort({ isPinned: -1, createdAt: 1 })
    .limit(200);
  res.json({ messages });
};

/**
 * POST /api/forum/:eventId
 * Post a new message. Must be registered participant OR organizer of event OR admin.
 */
export const postMessage = async (req, res) => {
  const { eventId } = req.params;
  const { message, parentId, type } = req.body || {};

  if (!message?.trim()) {
    return res.status(400).json({ message: 'Message cannot be empty' });
  }

  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ message: 'Event not found' });

  const accessError = await ensureForumAccess(event, req.user);
  if (accessError) return res.status(403).json({ message: accessError });

  const isAnnouncement = type === 'announcement' && ['organizer', 'admin'].includes(req.user.role);

  const doc = await EventMessage.create({
    event: eventId,
    user: req.user.id,
    message: message.trim(),
    parentId: parentId || null,
    type: isAnnouncement ? 'announcement' : 'message',
  });

  await doc.populate('user', 'name role');

  // Emit real-time
  const io = getIo();
  if (io) {
    io.to(`forum:${eventId}`).emit('message:new', doc);
  }

  res.status(201).json({ message: doc });
};

/**
 * DELETE /api/forum/message/:msgId
 * Organizer or admin can delete a message.
 */
export const deleteMessage = async (req, res) => {
  const { msgId } = req.params;
  const msg = await EventMessage.findById(msgId).populate('event', 'organizer');
  if (!msg) return res.status(404).json({ message: 'Message not found' });

  if (req.user.role === 'organizer') {
    if (String(msg.event?.organizer) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Cannot delete messages from other organizers events' });
    }
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }

  msg.isDeleted = true;
  await msg.save();

  const io = getIo();
  if (io) {
    io.to(`forum:${String(msg.event._id)}`).emit('message:deleted', { msgId: msg.id });
  }

  res.json({ message: 'Deleted' });
};

/**
 * PATCH /api/forum/message/:msgId/pin
 * Organizer pins/unpins a message.
 */
export const pinMessage = async (req, res) => {
  const { msgId } = req.params;
  const msg = await EventMessage.findById(msgId).populate('event', 'organizer');
  if (!msg) return res.status(404).json({ message: 'Message not found' });

  if (req.user.role === 'organizer') {
    if (String(msg.event?.organizer) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Cannot pin in other organizers events' });
    }
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }

  msg.isPinned = !msg.isPinned;
  await msg.save();
  await msg.populate('user', 'name role');

  const io = getIo();
  if (io) {
    io.to(`forum:${String(msg.event._id)}`).emit('message:updated', msg);
  }

  res.json({ message: msg });
};

/**
 * POST /api/forum/message/:msgId/react
 * Toggle a reaction on a message. Participants must be registered; organizer/admin allowed.
 */
export const reactToMessage = async (req, res) => {
  const { msgId } = req.params;
  const { emoji } = req.body || {};

  if (!ALLOWED_REACTIONS.includes(emoji)) {
    return res.status(400).json({ message: 'Invalid reaction' });
  }

  const msg = await EventMessage.findById(msgId);
  if (!msg || msg.isDeleted) return res.status(404).json({ message: 'Message not found' });

  const event = await Event.findById(msg.event);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  const accessError = await ensureForumAccess(event, req.user);
  if (accessError) return res.status(403).json({ message: accessError });

  const existingIndex = msg.reactions.findIndex(
    (r) => String(r.user) === String(req.user.id) && r.emoji === emoji
  );

  if (existingIndex >= 0) {
    msg.reactions.splice(existingIndex, 1);
  } else {
    msg.reactions.push({ emoji, user: req.user.id });
  }

  await msg.save();
  await msg.populate('user', 'name role');

  const io = getIo();
  if (io) {
    io.to(`forum:${String(msg.event)}`).emit('message:updated', msg);
  }

  res.json({ message: msg });
};
