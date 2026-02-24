import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import PasswordResetRequest from '../models/PasswordResetRequest.js';
import { Parser } from 'json2csv';
import { updateEventStatus, updateStatusesForMany } from '../utils/updateEventStatus.js';

// Count revenue for all confirmed registrations (both normal and merchandise)
const sumRevenue = (registrations = []) =>
  registrations.reduce((total, reg) => {
    // Skip cancelled/rejected registrations
    if (['cancelled', 'rejected'].includes(reg.status)) return total;
    // For merchandise, only count organizer-approved orders
    if (reg.type === 'merchandise') {
      if (reg.paymentStatus !== 'approved') return total;
    }
    return total + Number(reg.totalAmount || 0);
  }, 0);

export const organizerDashboardStats = async (req, res) => {
  const organizerId = req.user.id;
  const events = await Event.find({ organizer: organizerId }, '_id status startDate endDate');
  const refreshed = await updateStatusesForMany(events);
  const eventIds = refreshed.map((ev) => ev.id);

  const totalEventsCreated = refreshed.length;
  const activeEvents = refreshed.filter((ev) => ['published', 'ongoing'].includes(ev.status)).length;

  const registrations = eventIds.length
    ? await Registration.find({ event: { $in: eventIds } }, 'type totalAmount paymentStatus status')
    : [];

  const totalRegistrations = registrations.filter((r) => !['cancelled', 'rejected'].includes(r.status)).length;
  const totalRevenue = sumRevenue(registrations);
  const merchandiseRevenue = sumRevenue(registrations.filter((r) => r.type === 'merchandise'));
  const normalRevenue = sumRevenue(registrations.filter((r) => r.type === 'normal'));

  return res.json({ totalEventsCreated, activeEvents, totalRegistrations, totalRevenue, merchandiseRevenue, normalRevenue });
};

export const requestPasswordReset = async (req, res) => {
  const { reason } = req.body || {};
  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: 'Reason is required' });
  }
  const organizerId = req.user.id;

  const request = await PasswordResetRequest.create({
    organizerId,
    reason: reason.trim(),
    status: 'pending',
  });
  return res.status(201).json({ message: 'Password reset requested', requestId: request.id });
};

export const passwordResetHistory = async (req, res) => {
  const organizerId = req.user.id;
  const requests = await PasswordResetRequest.find({ organizerId }).sort({ createdAt: -1 });
  const mapped = requests.map((r) => ({
    id: r.id,
    reason: r.reason,
    status: r.status,
    adminComment: r.adminComment,
    createdAt: r.createdAt,
  }));
  return res.json({ requests: mapped });
};

export const organizerParticipants = async (req, res) => {
  const organizerId = req.user.id;
  const { id } = req.params;
  const { search, paymentStatus, attendance, fromDate, toDate, type: regType } = req.query;

  const event = await Event.findById(id);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (String(event.organizer) !== String(organizerId)) {
    return res.status(403).json({ message: 'Not your event' });
  }
  await updateEventStatus(event);

  const regFilter = { event: id };

  // Payment status
  if (paymentStatus) regFilter.paymentStatus = paymentStatus;

  // Registration type (normal / merchandise)
  if (regType) regFilter.type = regType;

  // Attendance — avoid using { attended: false } directly since older docs may lack the field
  if (attendance === 'true') regFilter.attended = true;
  if (attendance === 'false') regFilter.$or = [{ attended: false }, { attended: { $exists: false } }];

  // Date range on registration (createdAt)
  if (fromDate || toDate) {
    regFilter.createdAt = {};
    if (fromDate) regFilter.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      // Make toDate inclusive by setting time to end of day
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      regFilter.createdAt.$lte = end;
    }
  }

  const registrations = await Registration.find(regFilter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  const filtered = search
    ? registrations.filter((reg) => {
        const haystack = [reg.user?.name, reg.user?.email, reg.ticketId, reg.teamName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(search.toLowerCase().trim());
      })
    : registrations;

  const participants = filtered.map((reg) => ({
    id: reg.id,
    name: reg.user?.name,
    email: reg.user?.email,
    registrationDate: reg.createdAt,
    paymentStatus: reg.paymentStatus,
    type: reg.type,
    teamName: reg.teamName || null,
    attendanceStatus: reg.attended ? 'attended' : 'absent',
    ticketId: reg.ticketId,
  }));

  return res.json({ event, participants });
};

export const exportParticipantsCsv = async (req, res) => {
  const organizerId = req.user.id;
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (String(event.organizer) !== String(organizerId)) {
    return res.status(403).json({ message: 'Not your event' });
  }
  await updateEventStatus(event);

  const registrations = await Registration.find({ event: id })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  const parser = new Parser({ fields: ['ticketId', 'name', 'email', 'registrationDate', 'paymentStatus', 'attendanceStatus'] });
  const records = registrations.map((reg) => ({
    ticketId: reg.ticketId,
    name: reg.user?.name,
    email: reg.user?.email,
    registrationDate: reg.createdAt ? new Date(reg.createdAt).toISOString() : '',
    paymentStatus: reg.paymentStatus,
    attendanceStatus: reg.attended ? 'attended' : 'absent',
  }));

  const csv = parser.parse(records);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=event-${id}-participants.csv`);
  return res.send(csv);
};

/**
 * GET /api/organizer/merch-approvals
 * List ALL merchandise orders across organizer's events (all statuses).
 */
export const listPendingMerchOrders = async (req, res) => {
  const organizerId = req.user.id;
  const events = await Event.find({ organizer: organizerId, type: 'merchandise' }, '_id name');
  const eventIds = events.map((e) => e._id);
  if (!eventIds.length) return res.json({ orders: [] });

  const { status } = req.query; // optional filter: pending | approved | rejected
  const filter = { event: { $in: eventIds }, type: 'merchandise' };
  if (status) filter.paymentStatus = status;

  const orders = await Registration.find(filter)
    .populate('user', 'name email')
    .populate('event', 'name')
    .sort({ createdAt: -1 });

  res.json({ orders });
};

/**
 * PATCH /api/organizer/merch-approvals/:regId/approve
 */
export const approveMerchOrder = async (req, res) => {
  const { regId } = req.params;
  const reg = await Registration.findById(regId).populate('event').populate('user', 'name email');
  if (!reg) return res.status(404).json({ message: 'Order not found' });
  if (String(reg.event?.organizer) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Not your event' });
  }
  if (reg.paymentStatus !== 'pending') {
    return res.status(400).json({ message: 'Order is not pending' });
  }

  const event = reg.event;

  // Decrement stock now that payment is confirmed
  for (const item of reg.purchasedItems || []) {
    const variant = event.merchandiseVariants.find((v) => v.name === item.variantName);
    if (variant) {
      if (variant.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${item.variantName}` });
      }
      variant.stock -= item.quantity;
    }
  }
  await event.save();

  // Generate QR now that order is approved
  const { generateQrDataUrl, sendTicketEmail } = await import('../utils/tickets.js');
  const qrPayload = {
    ticketId: reg.ticketId,
    eventId: String(event._id),
    eventName: event.name,
    participantEmail: reg.user.email,
    participantName: reg.user.name,
  };
  const qrData = await generateQrDataUrl(qrPayload);
  reg.qrData = qrData;
  reg.paymentStatus = 'approved';
  reg.reviewedBy = req.user.id;
  reg.reviewedAt = new Date();
  await reg.save();

  // Send ticket email (best-effort)
  try {
    await sendTicketEmail({
      to: reg.user.email,
      eventName: event.name,
      eventDate: event.saleStartDate ? new Date(event.saleStartDate).toLocaleString() : '',
      ticketId: reg.ticketId,
      qrData,
      participantName: reg.user.name,
      participantEmail: reg.user.email,
    });
  } catch (_emailErr) {
    console.error('Ticket email failed (approval):', _emailErr.message);
  }

  res.json({ message: 'Order approved. QR ticket sent to participant.', registration: reg });
};

/**
 * PATCH /api/organizer/merch-approvals/:regId/reject
 */
export const rejectMerchOrder = async (req, res) => {
  const { regId } = req.params;
  const { reason } = req.body || {};
  const reg = await Registration.findById(regId).populate('event', 'organizer name');
  if (!reg) return res.status(404).json({ message: 'Order not found' });
  if (String(reg.event?.organizer) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Not your event' });
  }
  if (reg.paymentStatus !== 'pending') {
    return res.status(400).json({ message: 'Order is not pending' });
  }
  reg.paymentStatus = 'rejected';
  reg.rejectionReason = reason?.trim() || null;
  reg.reviewedBy = req.user.id;
  reg.reviewedAt = new Date();
  await reg.save();
  res.json({ message: 'Order rejected', registration: reg });
};
