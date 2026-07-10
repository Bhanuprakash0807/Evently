import Event from '../models/Event.js';

const allowedForPublishedNormal = ['description', 'registrationDeadline', 'registrationLimit'];
const allowedForPublishedMerch = ['description', 'saleEndDate', 'stock'];

export const checkEventEditPermission = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (String(event.organizer) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Cannot edit another organizer event' });
    }

    const status = event.status;
    const payload = req.body || {};

    if (status === 'draft') {
      req.event = event;
      return next();
    }

    if (status === 'published') {
      const allowed = event.type === 'merchandise' ? allowedForPublishedMerch : allowedForPublishedNormal;
      const invalidKey = Object.keys(payload).find((key) => !allowed.includes(key));
      if (invalidKey) {
        return res.status(403).json({
          message: event.type === 'merchandise'
            ? 'Only description, sale end date, and stock can be edited when published'
            : 'Only description, deadline, and limit can be edited when published',
        });
      }

      if (payload.registrationDeadline) {
        const incoming = new Date(payload.registrationDeadline);
        const current = event.registrationDeadline ? new Date(event.registrationDeadline) : null;
        if (current && incoming < current) {
          return res.status(403).json({ message: 'Cannot shorten the registration deadline once published' });
        }
      }

      if (payload.saleEndDate) {
        const incoming = new Date(payload.saleEndDate);
        const current = event.saleEndDate ? new Date(event.saleEndDate) : null;
        if (current && incoming < current) {
          return res.status(403).json({ message: 'Cannot shorten the sale end date once published' });
        }
      }

      if (payload.registrationLimit !== undefined && event.registrationLimit !== undefined) {
        if (Number(payload.registrationLimit) < Number(event.registrationLimit)) {
          return res.status(403).json({ message: 'Registration limit can only be increased' });
        }
      }

      req.event = event;
      return next();
    }

    // sale-live, sale-ended, ongoing, completed, closed — no edits allowed
    if (['sale-live', 'sale-ended', 'ongoing', 'completed', 'closed'].includes(status)) {
      return res.status(403).json({ message: 'Event cannot be edited in its current status' });
    }

    req.event = event;
    return next();
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Failed to process edit permission' });
  }
};
