export const computeEventStatus = (event) => {
  if (!event) return null;
  const immutable = ['draft', 'closed'];
  if (immutable.includes(event.status)) return event.status;

  const now = new Date();

  if (event.type === 'merchandise') {
    const saleStart = event.saleStartDate ? new Date(event.saleStartDate) : null;
    const saleEnd = event.saleEndDate ? new Date(event.saleEndDate) : null;
    if (!saleStart || !saleEnd) return event.status;
    if (now < saleStart) return 'published';
    if (now >= saleStart && now <= saleEnd) return 'sale-live';
    if (now > saleEnd) return 'sale-ended';
    return event.status;
  }

  const start = event.startDate ? new Date(event.startDate) : null;
  const end = event.endDate ? new Date(event.endDate) : null;

  if (!start || !end) return event.status;
  if (now < start) return 'published';
  if (now >= start && now <= end) return 'ongoing';
  if (now > end) return 'completed';
  return event.status;
};

export const updateEventStatus = async (event) => {
  const nextStatus = computeEventStatus(event);
  if (nextStatus && nextStatus !== event.status) {
    event.status = nextStatus;
    await event.save();
  }
  return event;
};

export const updateStatusesForMany = async (events = []) => {
  const results = [];
  for (const ev of events) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await updateEventStatus(ev));
  }
  return results;
};
