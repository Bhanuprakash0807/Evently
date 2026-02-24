import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import { generateQrDataUrl, generateTicketId, sendTicketEmail } from '../utils/tickets.js';
import { updateEventStatus } from '../utils/updateEventStatus.js';

const ensureParticipant = (user) => {
  if (!user || user.role !== 'participant') {
    const err = new Error('Participant role required');
    err.status = 403;
    throw err;
  }
};

const refreshEventsForRegistrations = async (registrations = []) => {
  const seen = new Set();
  for (const reg of registrations) {
    if (reg.event && !seen.has(String(reg.event._id))) {
      seen.add(String(reg.event._id));
      // eslint-disable-next-line no-await-in-loop
      await updateEventStatus(reg.event);
    }
  }
};

const fetchUserRegistrations = (userId) =>
  Registration.find({ user: userId })
    .populate({ path: 'event', populate: { path: 'organizer', select: 'name organizerProfile' } })
    .sort({ createdAt: -1 });

const ensureNotPastDeadline = (event) => {
  if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
    const err = new Error('Registration deadline passed');
    err.status = 400;
    throw err;
  }
};

const ensureSlotsAvailable = async (event) => {
  if (!event.registrationLimit) return;
  const count = await Registration.countDocuments({ event: event.id });
  if (count >= event.registrationLimit) {
    const err = new Error('Registration limit reached');
    err.status = 400;
    throw err;
  }
};

const buildTicketPayload = (registration, event, user) => ({
  ticketId: registration.ticketId,
  eventId: event.id,
  eventName: event.name,
  participantEmail: user.email,
  participantName: user.name,
});

const ensureEventOpen = (event) => {
  const isNormalOpen = event.type === 'normal' && event.status === 'published';
  const isMerchOpen = event.type === 'merchandise' && event.status === 'sale-live';
  if (!isNormalOpen && !isMerchOpen) {
    const err = new Error('Registrations are closed for this event');
    err.status = 400;
    throw err;
  }
};

const ensureEligibilityMatch = (event, user) => {
  const allowed = event.eligibility || 'both';
  const participantType = user.participantType || (user.isIIIT ? 'iiit' : 'non-iiit');
  if (allowed === 'both') return;
  if (allowed === 'iiit' && participantType === 'iiit') return;
  if (allowed === 'non-iiit' && participantType === 'non-iiit') return;
  const err = new Error('You are not eligible to register for this event');
  err.status = 403;
  throw err;
};

const validateFormResponses = (event, responses = []) => {
  const schema = event.customFormSchema || [];
  if (!schema.length) return;
  const responseMap = new Map(responses.map((r) => [r.label, r.value]));
  for (const field of schema) {
    const value = responseMap.get(field.label);
    if (field.required) {
      const missing = value === undefined || value === null || value === '' || (field.type === 'checkbox' && !value);
      if (missing) {
        const err = new Error(`Field "${field.label}" is required`);
        err.status = 400;
        throw err;
      }
    }
    if (field.type === 'dropdown' && value && field.options?.length) {
      if (!field.options.includes(value)) {
        const err = new Error(`Invalid option for ${field.label}`);
        err.status = 400;
        throw err;
      }
    }
  }
};

export const registerForEvent = async (req, res) => {
  try {
    ensureParticipant(req.user);
    const { id } = req.params; // event id
    const { responses = [], teamName } = req.body || {};
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.type !== 'normal') return res.status(400).json({ message: 'Use purchase for merchandise events' });
    await updateEventStatus(event);
    ensureEligibilityMatch(event, req.user);
    ensureEventOpen(event);
    ensureNotPastDeadline(event);
    await ensureSlotsAvailable(event);
    validateFormResponses(event, responses);

    const existing = await Registration.findOne({ event: id, user: req.user.id });
    if (existing) return res.status(400).json({ message: 'Already registered' });

    const ticketId = generateTicketId();
    const registration = await Registration.create({
      user: req.user.id,
      event: id,
      type: 'normal',
      ticketId,
      teamName: teamName?.trim(),
      formResponses: responses || [],
      totalAmount: Number(event.registrationFee || 0),
    });

    if (!event.formLocked) {
      event.formLocked = true;
      await event.save();
    }

    const qrData = await generateQrDataUrl(buildTicketPayload(registration, event, req.user));
    registration.qrData = qrData;
    await registration.save();

    // Best-effort email — registration is already saved so we never block on this
    try {
      await sendTicketEmail({
        to: req.user.email,
        eventName: event.name,
        eventDate: event.startDate ? new Date(event.startDate).toLocaleString() : '',
        ticketId,
        qrData,
        participantName: req.user.name,
        participantEmail: req.user.email,
      });
    } catch (_emailErr) {
      // log but do not fail the registration
      console.error('Ticket email failed (normal):', _emailErr.message);
    }

    res.status(201).json({ registration });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message || 'Registration failed' });
  }
};

export const purchaseMerchandise = async (req, res) => {
  try {
    ensureParticipant(req.user);
    const { id } = req.params; // event id
    const { items, teamName, responses = [] } = req.body || {};
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.type !== 'merchandise') return res.status(400).json({ message: 'Not a merchandise event' });
    await updateEventStatus(event);
    ensureEligibilityMatch(event, req.user);
    const now = new Date();
    if (event.saleStartDate && now < new Date(event.saleStartDate)) {
      return res.status(400).json({ message: 'Sale has not started' });
    }
    if (event.saleEndDate && now > new Date(event.saleEndDate)) {
      return res.status(400).json({ message: 'Sale has ended' });
    }
    ensureEventOpen(event);
    ensureNotPastDeadline(event);
    validateFormResponses(event, responses);

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'No items selected' });
    }

    const priorPurchases = await Registration.find({ event: id, user: req.user.id, type: 'merchandise' });
    const priorCounts = new Map();
    priorPurchases.forEach((reg) => {
      (reg.purchasedItems || []).forEach((item) => {
        const key = item.variantName;
        priorCounts.set(key, (priorCounts.get(key) || 0) + Number(item.quantity || 0));
      });
    });

    let total = 0;
    const variantUpdates = [];
    const purchasedItems = (items || []).map((item) => {
      const variant = event.merchandiseVariants.find((v) => v.name === item.variantName);
      if (!variant) {
        throw Object.assign(new Error('Variant not found'), { status: 400 });
      }
      const qty = Number(item.quantity || 0);
      if (qty <= 0) throw Object.assign(new Error('Quantity must be positive'), { status: 400 });
      if (qty > variant.stock) {
        throw Object.assign(new Error('Insufficient stock'), { status: 400 });
      }
      const already = priorCounts.get(variant.name) || 0;
      if (qty + already > variant.purchaseLimitPerUser) {
        throw Object.assign(new Error('Exceeds per-user limit'), { status: 400 });
      }
      variantUpdates.push({ variant, qty });
      total += variant.price * qty;
      return {
        variantName: variant.name,
        size: variant.size,
        color: variant.color,
        quantity: qty,
        price: variant.price,
      };
    });

    // ── Do NOT decrement stock yet — wait for organizer approval ───────
    event.formLocked = true;
    await event.save();

    // ── Create registration in pending state (no QR yet) ─────────────
    const { paymentProofUrl } = req.body || {};
    const ticketId = generateTicketId();
    const registration = await Registration.create({
      user: req.user.id,
      event: id,
      type: 'merchandise',
      ticketId,
      teamName: teamName?.trim(),
      purchasedItems,
      totalAmount: total,
      formResponses: responses || [],
      paymentStatus: 'pending',
      paymentProofUrl: paymentProofUrl || null,
    });
    // qrData intentionally NOT generated here — spec: no QR in pending/rejected state

    res.status(201).json({
      registration,
      message: 'Order placed. Please upload your payment proof so the organizer can approve your order.',
    });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message || 'Purchase failed' });
  }
};

export const uploadPaymentProof = async (req, res) => {
  try {
    ensureParticipant(req.user);
    const { id } = req.params; // registration id
    const { paymentProofUrl } = req.body || {};
    if (!paymentProofUrl) {
      return res.status(400).json({ message: 'Payment proof is required' });
    }
    const reg = await Registration.findById(id);
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    if (String(reg.user) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not your registration' });
    }
    if (!['pending', 'rejected'].includes(reg.paymentStatus)) {
      return res.status(400).json({ message: 'Cannot upload proof for this order' });
    }
    reg.paymentProofUrl = paymentProofUrl;
    reg.paymentStatus = 'pending';
    reg.rejectionReason = null;
    await reg.save();
    res.json({ registration: reg });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message || 'Upload failed' });
  }
};

export const myRegistrations = async (req, res) => {
  ensureParticipant(req.user);
  const regs = await fetchUserRegistrations(req.user.id);
  res.json({ registrations: regs });
};

export const participantUpcoming = async (req, res) => {
  ensureParticipant(req.user);
  const regs = await fetchUserRegistrations(req.user.id);
  await refreshEventsForRegistrations(regs);
  const now = new Date();
  const filtered = regs.filter((reg) => {
    const start = reg.event?.startDate ? new Date(reg.event.startDate) : null;
    return start && start >= now && reg.status === 'registered';
  });
  res.json({ registrations: filtered });
};

export const participantCompleted = async (req, res) => {
  ensureParticipant(req.user);
  const regs = await fetchUserRegistrations(req.user.id);
  await refreshEventsForRegistrations(regs);
  const filtered = regs.filter(
    (reg) => reg.status === 'completed' || reg.event?.status === 'completed'
  );
  res.json({ registrations: filtered });
};

export const participantCancelled = async (req, res) => {
  ensureParticipant(req.user);
  const regs = await fetchUserRegistrations(req.user.id);
  await refreshEventsForRegistrations(regs);
  const filtered = regs.filter((reg) => ['cancelled', 'rejected'].includes(reg.status));
  res.json({ registrations: filtered });
};

export const participantMerchandise = async (req, res) => {
  ensureParticipant(req.user);
  const regs = await fetchUserRegistrations(req.user.id);
  await refreshEventsForRegistrations(regs);
  const filtered = regs.filter((reg) => reg.type === 'merchandise');
  res.json({ registrations: filtered });
};
