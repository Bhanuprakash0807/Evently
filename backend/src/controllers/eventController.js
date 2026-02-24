import Fuse from 'fuse.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';
import { updateEventStatus, updateStatusesForMany } from '../utils/updateEventStatus.js';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildFuzzyRegex = (value = '') => new RegExp(value.split('').map(escapeRegex).join('.*'), 'i');
const sendDiscordWebhook = async (url, content) => {
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  } catch (err) {
    // best-effort; do not block event creation
    return;
  }
};

const computeStats = (event, registrations = []) => {
  const totals = {
    registrations: registrations.length,
    completed: registrations.filter((r) => r.status === 'completed').length,
    cancelled: registrations.filter((r) => ['cancelled', 'rejected'].includes(r.status)).length,
    merchandise: registrations.filter((r) => r.type === 'merchandise').length,
    normal: registrations.filter((r) => r.type === 'normal').length,
    revenue: 0,
    attendance: registrations.filter((r) => r.attended || r.status === 'completed').length,
  };
  // Only count revenue for non-cancelled/rejected registrations with confirmed payment
  registrations.forEach((reg) => {
    if (['cancelled', 'rejected'].includes(reg.status)) return;
    if (reg.type === 'normal') {
      // Use stored totalAmount; fall back to event.registrationFee for legacy records missing it
      totals.revenue += Number(reg.totalAmount || event.registrationFee || 0);
    } else if (reg.paymentStatus === 'approved') {
      totals.revenue += Number(reg.totalAmount || 0);
    }
  });
  return totals;
};

const ensureOrganizer = (user) => {
  if (!user || user.role !== 'organizer') {
    const err = new Error('Organizer role required');
    err.status = 403;
    throw err;
  }
};

const computeTrendingEvents = async () => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const top = await Registration.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$event', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  const ids = top.map((t) => t._id);
  if (!ids.length) return [];
  const events = await Event.find({ _id: { $in: ids }, status: { $in: ['published', 'ongoing'] } }).populate('organizer');
  const refreshed = await updateStatusesForMany(events);
  const map = new Map(refreshed.map((ev) => [String(ev._id), ev]));
  return top
    .map((t) => map.get(String(t._id)))
    .filter((ev) => ev && ['published', 'ongoing'].includes(ev.status));
};

export const createEvent = async (req, res) => {
  try {
    ensureOrganizer(req.user);
    const payload = req.body || {};
    const customFormSchema = payload.customFormSchema || payload.formFields || [];
    // Normalize irrelevant fields by type
    if (payload.type === 'merchandise') {
      payload.registrationDeadline = null;
      payload.startDate = null;
      payload.endDate = null;
      payload.registrationLimit = null;
      payload.registrationFee = null;
    } else if (payload.type === 'normal') {
      payload.stock = null;
      payload.purchaseLimit = null;
      payload.variants = [];
      payload.saleStartDate = null;
      payload.saleEndDate = null;
    }
    const event = await Event.create({
      ...payload,
      organizer: req.user.id,
      status: 'draft',
      customFormSchema,
    });
    await updateEventStatus(event);
    if (req.user.organizerProfile?.webhookUrl) {
      sendDiscordWebhook(
        req.user.organizerProfile.webhookUrl,
        `New event created: **${event.name}** (${event.type}) by ${req.user.name}`
      );
    }
    res.status(201).json({ event });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message || 'Failed to create event' });
  }
};

export const updateEvent = async (req, res) => {
  try {
    ensureOrganizer(req.user);
    const { id } = req.params;
    const event = req.event || (await Event.findById(id));
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizer) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Cannot edit another organizer event' });
    }
    if (req.body?.formFields || req.body?.customFormSchema) {
      if (event.formLocked) {
        return res.status(400).json({ message: 'Form is locked after first registration' });
      }
      const regCount = await Registration.countDocuments({ event: id });
      if (regCount > 0) {
        return res.status(400).json({ message: 'Form is locked after first registration' });
      }
    }
    const payload = { ...(req.body || {}) };
    if (payload.status && payload.status !== event.status) {
      return res.status(400).json({ message: 'Status cannot be changed here. Use publish/close/complete actions.' });
    }
    const nextType = payload.type || event.type;
    if (nextType === 'merchandise') {
      payload.registrationDeadline = null;
      payload.startDate = null;
      payload.endDate = null;
      payload.registrationLimit = null;
      payload.registrationFee = null;
    } else if (nextType === 'normal') {
      payload.stock = null;
      payload.purchaseLimit = null;
      payload.variants = [];
      payload.saleStartDate = null;
      payload.saleEndDate = null;
    }
    Object.assign(event, payload);
    await event.save();
    await updateEventStatus(event);
    res.json({ event });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message || 'Failed to update event' });
  }
};

export const publishEvent = async (req, res) => {
  ensureOrganizer(req.user);
  const { id } = req.params;
  const event = await Event.findById(id);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (String(event.organizer) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Cannot publish another organizer event' });
  }
  if (event.status !== 'draft') {
    return res.status(400).json({ message: 'Only draft events can be published' });
  }
  // Validate required fields before publishing
  if (event.type === 'normal') {
    if (!event.registrationDeadline || !event.startDate || !event.endDate || event.registrationLimit === null || event.registrationFee === null) {
      return res.status(400).json({ message: 'Fill required fields (dates, limit, fee) before publishing.' });
    }
  }
  if (event.type === 'merchandise') {
    if (!event.saleStartDate || !event.saleEndDate || event.stock === null || event.purchaseLimit === null) {
      return res.status(400).json({ message: 'Fill required fields (sale window, stock, purchase limit) before publishing.' });
    }
  }

  event.status = 'published';
  await event.save();
  await updateEventStatus(event);
  const webhookUrl = req.user.organizerProfile?.discordWebhookUrl || req.user.organizerProfile?.webhookUrl;
  if (webhookUrl) {
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_BASE_URL || '';
    const registrationLink = `${baseUrl}/events/${id}`;
    const dateLabel =
      event.type === 'merchandise'
        ? `Sale: ${event.saleStartDate ? new Date(event.saleStartDate).toLocaleString() : 'TBD'} - ${
            event.saleEndDate ? new Date(event.saleEndDate).toLocaleString() : 'TBD'
          }`
        : `Date: ${event.startDate ? new Date(event.startDate).toLocaleString() : 'TBD'}`;
    sendDiscordWebhook(
      webhookUrl,
      `📢 Event Published: **${event.name}**\n${dateLabel}\nRegister: ${registrationLink}`
    );
  }
  return res.json({ event });
};

export const closeEvent = async (req, res) => {
  ensureOrganizer(req.user);
  const { id } = req.params;
  const event = await Event.findById(id);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (String(event.organizer) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Cannot close another organizer event' });
  }
  if (!['published', 'ongoing', 'sale-live'].includes(event.status)) {
    return res.status(400).json({ message: 'Only published/ongoing events can be closed' });
  }
  event.status = 'closed';
  await event.save();
  return res.json({ event });
};

export const completeEvent = async (req, res) => {
  ensureOrganizer(req.user);
  const { id } = req.params;
  const event = await Event.findById(id);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (String(event.organizer) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Cannot complete another organizer event' });
  }
  if (!['ongoing', 'published', 'sale-live', 'sale-ended'].includes(event.status)) {
    return res.status(400).json({ message: 'Only active events can be marked completed' });
  }
  event.status = 'completed';
  await event.save();
  return res.json({ event });
};

export const getEvents = async (req, res) => {
  const {
    search,
    q,
    type,
    eligibility,
    startDate,
    endDate,
    tags,
    followedOnly,
    personalized,
    trending,
    usePreferences,
  } = req.query;

  if (trending) {
    const events = await computeTrendingEvents();
    return res.json({ events });
  }

  const searchTerm = (search || q || '').trim();
  // Fetch all live/visible statuses — events already saved as sale-live/sale-ended must be included
  const VISIBLE_STATUSES = ['published', 'ongoing', 'sale-live', 'sale-ended'];
  const filter = { status: { $in: VISIBLE_STATUSES } };

  if (type) filter.type = type;
  if (eligibility) filter.eligibility = eligibility;
  if (tags) filter.tags = { $in: tags.split(',').map((t) => t.trim()) };
  if (startDate || endDate) {
    filter.startDate = {};
    if (startDate) filter.startDate.$gte = new Date(startDate);
    if (endDate) filter.startDate.$lte = new Date(endDate);
  }

  if (followedOnly === 'true' || followedOnly === true) {
    const followed = req.user?.followedOrganizers || [];
    if (!followed.length) return res.json({ events: [], trending: [] });
    filter.organizer = { $in: followed };
  }

  const events = await Event.find(filter).sort({ startDate: 1 }).limit(200).populate('organizer');
  const hydrated = await updateStatusesForMany(events);
  const unique = new Map();
  hydrated.forEach((ev) => unique.set(String(ev._id), ev));
  let visibleEvents = Array.from(unique.values()).filter((ev) => VISIBLE_STATUSES.includes(ev.status));

  if (searchTerm) {
    const fuse = new Fuse(visibleEvents, {
      keys: ['name', 'organizer.name'],
      threshold: 0.35,
    });
    visibleEvents = fuse.search(searchTerm).map((r) => r.item);
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Trending: always computed globally (not scoped to current filters/search)
  const globalTrendingRaw = await Registration.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$event', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);
  const globalTrendingIds = globalTrendingRaw.map((t) => t._id);
  const globalTrendingEvents = globalTrendingIds.length
    ? await Event.find({ _id: { $in: globalTrendingIds }, status: { $in: VISIBLE_STATUSES } }).populate('organizer')
    : [];
  const trendingMap = new Map(globalTrendingEvents.map((ev) => [String(ev._id), ev]));
  const trendingList = globalTrendingRaw
    .map((t) => trendingMap.get(String(t._id)))
    .filter(Boolean);

  // Per-visible-event trending counts for scoring
  let trendingCounts = {};
  if (visibleEvents.length) {
    const counts = await Registration.aggregate([
      { $match: { event: { $in: visibleEvents.map((ev) => ev._id) }, createdAt: { $gte: since } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]);
    trendingCounts = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  }

  const prefFlag = usePreferences !== undefined ? String(usePreferences) !== 'false' : undefined;
  const personalizedFlag = personalized !== undefined ? personalized !== 'false' : undefined;
  const usePersonalization = req.user?.role === 'participant' && (prefFlag ?? personalizedFlag ?? true);
  const interestSet = new Set((req.user?.interests || []).map((t) => t.toLowerCase()));
  const followedSet = new Set((req.user?.followedOrganizers || []).map((id) => String(id)));

  if (!usePersonalization) {
    const sorted = [...visibleEvents].sort((a, b) => {
      const aTrend = trendingCounts[String(a._id)] || 0;
      const bTrend = trendingCounts[String(b._id)] || 0;
      if (aTrend !== bTrend) return bTrend - aTrend;
      return new Date(a.startDate) - new Date(b.startDate);
    });
    return res.json({ events: sorted, trending: trendingList });
  }

  const scored = visibleEvents.map((event) => {
    const tagsList = (event.tags || []).map((t) => t.toLowerCase());
    const interestScore = tagsList.reduce((score, tag) => score + (interestSet.has(tag) ? 1 : 0), 0);
    const followScore = event.organizer && followedSet.has(String(event.organizer._id)) ? 1 : 0;
    const trendScore = trendingCounts[String(event._id)] || 0;
    const recommendationScore = followScore * 10 + interestScore * 3 + trendScore;
    return { event: event.toObject({ virtuals: true }), followScore, interestScore, trendScore, recommendationScore };
  });

  scored.sort((a, b) => {
    if (a.followScore !== b.followScore) return b.followScore - a.followScore;
    if (a.interestScore !== b.interestScore) return b.interestScore - a.interestScore;
    if (a.trendScore !== b.trendScore) return b.trendScore - a.trendScore;
    return new Date(a.event.startDate) - new Date(b.event.startDate);
  });

  return res.json({
    events: scored.map(({ event, recommendationScore }) => ({ ...event, recommendationScore })),
    trending: trendingList,
  });
};

export const getTrendingEvents = async (_req, res) => {
  const events = await computeTrendingEvents();
  return res.json({ events });
};

export const getEventById = async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer');
  if (!event) return res.status(404).json({ message: 'Event not found' });
  await updateEventStatus(event);
  const now = new Date();
  const deadlinePassed = event.registrationDeadline && new Date(event.registrationDeadline) < now;
  const saleNotStarted = event.saleStartDate && now < new Date(event.saleStartDate);
  const saleEnded = event.saleEndDate && now > new Date(event.saleEndDate);
  let remainingSlots = null;
  if (event.type === 'normal' && event.registrationLimit) {
    const count = await Registration.countDocuments({ event: event.id });
    remainingSlots = Math.max(0, event.registrationLimit - count);
  }
  const variants = event.merchandiseVariants || [];
  const soldOut =
    event.type === 'merchandise' && variants.length > 0 && variants.every((v) => (v.stock || 0) <= 0);
  const canRegister =
    ((event.type === 'normal' && event.status === 'published' && !deadlinePassed) ||
      (event.type === 'merchandise' && event.status === 'sale-live' && !saleEnded && !saleNotStarted)) &&
    !soldOut &&
    (remainingSlots === null || remainingSlots > 0);

  res.json({
    event: {
      ...event.toObject({ virtuals: true }),
      deadlinePassed,
      saleNotStarted,
      saleEnded,
      remainingSlots,
      soldOut,
      canRegister,
    },
  });
};

export const organizerEvents = async (req, res) => {
  ensureOrganizer(req.user);
  const includeStats = req.query.includeStats === 'true';
  const events = await Event.find({ organizer: req.user.id }).sort({ createdAt: -1 });
  const refreshed = await updateStatusesForMany(events);
  if (!includeStats) return res.json({ events: refreshed });

  const withStats = await Promise.all(
    refreshed.map(async (ev) => {
      const regs = await Registration.find({ event: ev.id });
      return { ...ev.toObject({ virtuals: true }), stats: computeStats(ev, regs) };
    })
  );
  res.json({ events: withStats });
};

export const listOrganizers = async (_req, res) => {
  const organizers = await User.find({ role: 'organizer' }, 'name organizerProfile');
  res.json({ organizers });
};

export const organizerDetail = async (req, res) => {
  const organizer = await User.findById(req.params.id, 'name organizerProfile email role');
  if (!organizer || organizer.role !== 'organizer') {
    return res.status(404).json({ message: 'Organizer not found' });
  }
  const events = await Event.find({ organizer: organizer.id, status: { $in: ['published', 'ongoing', 'completed', 'closed'] } }).sort({ startDate: 1 });
  const refreshed = await updateStatusesForMany(events);
  const now = new Date();
  const upcoming = refreshed.filter((ev) => new Date(ev.startDate) >= now);
  const past = refreshed.filter((ev) => new Date(ev.startDate) < now);
  res.json({ organizer, upcoming, past });
};

export const organizerEventAdmin = async (req, res) => {
  ensureOrganizer(req.user);
  const { id } = req.params;
  const event = await Event.findById(id).populate('organizer');
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (String(event.organizer._id) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Not your event' });
  }
  await updateEventStatus(event);

  const q = req.query.q?.trim();
  const status = req.query.status;
  const type = req.query.type;

  const regFilter = { event: id };
  if (status) regFilter.status = status;
  if (type) regFilter.type = type;
  if (q) {
    regFilter.$or = [
      { ticketId: { $regex: escapeRegex(q), $options: 'i' } },
      { teamName: { $regex: escapeRegex(q), $options: 'i' } },
    ];
  }

  const registrations = await Registration.find(regFilter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  const stats = computeStats(event, registrations);

  res.json({
    event,
    stats,
    registrations,
  });
};

export const exportRegistrationsCsv = async (req, res) => {
  ensureOrganizer(req.user);
  const { id } = req.params;
  const event = await Event.findById(id).populate('organizer');
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (String(event.organizer._id) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Not your event' });
  }
  const regs = await Registration.find({ event: id }).populate('user', 'name email');
  const rows = [
    ['Ticket ID', 'Name', 'Email', 'Type', 'Status', 'Payment', 'Team', 'Amount', 'Registered At'],
    ...regs.map((r) => [
      r.ticketId,
      r.user?.name || '',
      r.user?.email || '',
      r.type,
      r.status,
      r.paymentStatus,
      r.teamName || '',
      r.type === 'normal' ? Number(event.registrationFee || 0) : Number(r.totalAmount || 0),
      r.createdAt ? new Date(r.createdAt).toISOString() : '',
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=event-${id}-registrations.csv`);
  res.send(csv);
};
