import crypto from 'crypto';
import Team from '../models/Team.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import {
  generateQrDataUrl,
  generateTicketId,
  sendTicketEmail,
} from '../utils/tickets.js';

const ensureParticipant = (user) => {
  if (!user || user.role !== 'participant') {
    const err = new Error('Participant role required');
    err.status = 403;
    throw err;
  }
};

/**
 * POST /api/teams/:eventId/create
 * Leader creates a new team for an event.
 */
export const createTeam = async (req, res) => {
  try {
    ensureParticipant(req.user);
    const { eventId } = req.params;
    const { teamName, teamSizeLimit } = req.body || {};

    if (!teamName?.trim()) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const event = await Event.findById(eventId);
    if (!event || event.type !== 'normal') {
      return res.status(404).json({ message: 'Event not found or not a team event' });
    }

    // Use event's maxTeamSize if set; otherwise honour caller's value
    const sizeLimit = event.maxTeamSize
      ? event.maxTeamSize
      : Number(teamSizeLimit);
    if (!sizeLimit || sizeLimit < 2 || sizeLimit > 20) {
      return res.status(400).json({ message: 'Team size must be between 2 and 20' });
    }

    // One team per user per event
    const existing = await Team.findOne({ event: eventId, 'members.user': req.user.id });
    if (existing) {
      return res.status(400).json({ message: 'You are already in a team for this event' });
    }

    let inviteCode = crypto.randomBytes(5).toString('hex').toUpperCase();
    // Ensure uniqueness
    while (await Team.findOne({ inviteCode })) {
      inviteCode = crypto.randomBytes(5).toString('hex').toUpperCase();
    }

    const team = await Team.create({
      event: eventId,
      leader: req.user.id,
      teamName: teamName.trim(),
      teamSizeLimit: sizeLimit,
      inviteCode,
      members: [{ user: req.user.id, status: 'joined' }],
      status: sizeLimit === 1 ? 'complete' : 'forming',
    });

    await team.populate('members.user', 'name email');
    res.status(201).json({ team });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message || 'Failed to create team' });
  }
};

/**
 * POST /api/teams/join
 * Member joins a team via invite code.
 */
export const joinTeam = async (req, res) => {
  try {
    ensureParticipant(req.user);
    const { inviteCode } = req.body || {};
    if (!inviteCode?.trim()) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const team = await Team.findOne({ inviteCode: inviteCode.trim().toUpperCase() }).populate('members.user', 'name email');
    if (!team) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }
    if (team.status !== 'forming') {
      return res.status(400).json({ message: 'Team is already complete or registered' });
    }

    const alreadyMember = team.members.some((m) => String(m.user._id || m.user) === String(req.user.id));
    if (alreadyMember) {
      return res.status(400).json({ message: 'You are already in this team' });
    }

    // Check if user is in another team for same event
    const otherTeam = await Team.findOne({ event: team.event, 'members.user': req.user.id });
    if (otherTeam) {
      return res.status(400).json({ message: 'You are already in another team for this event' });
    }

    team.members.push({ user: req.user.id, status: 'joined' });
    const joinedCount = team.members.filter((m) => m.status === 'joined').length;
    if (joinedCount >= team.teamSizeLimit) {
      team.status = 'complete';
    }
    await team.save();
    await team.populate('members.user', 'name email');
    await team.populate('event', 'name type');

    res.json({ team });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message || 'Failed to join team' });
  }
};

/**
 * POST /api/teams/:teamId/register
 * Leader submits team registration — requires team to be complete.
 * Creates a registration for each member.
 */
export const registerTeam = async (req, res) => {
  try {
    ensureParticipant(req.user);
    const { teamId } = req.params;
    const { responses = [] } = req.body || {};

    const team = await Team.findById(teamId).populate('event').populate('members.user', 'name email');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (String(team.leader) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the team leader can register the team' });
    }
    if (team.status !== 'complete') {
      return res.status(400).json({ message: `Team is not complete yet (${team.members.filter((m) => m.status === 'joined').length}/${team.teamSizeLimit} joined)` });
    }
    if (team.status === 'registered') {
      return res.status(400).json({ message: 'Team is already registered' });
    }

    const event = team.event;
    if (!event || event.type !== 'normal') {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.status !== 'published') {
      return res.status(400).json({ message: 'Event registrations are closed' });
    }

    // Check slots for all members
    if (event.registrationLimit) {
      const count = await Registration.countDocuments({ event: event.id });
      const joinedMembers = team.members.filter((m) => m.status === 'joined').length;
      if (count + joinedMembers > event.registrationLimit) {
        return res.status(400).json({ message: 'Not enough slots for the whole team' });
      }
    }

    // Check no member is already individually registered
    const memberIds = team.members.filter((m) => m.status === 'joined').map((m) => String(m.user._id || m.user));
    const existingRegs = await Registration.find({ event: event.id, user: { $in: memberIds } });
    if (existingRegs.length) {
      return res.status(400).json({ message: 'One or more members are already registered individually' });
    }

    // Create registrations for all joined members
    const registrations = [];
    for (const member of team.members.filter((m) => m.status === 'joined')) {
      const userId = member.user._id || member.user;
      const user = member.user;
      const ticketId = generateTicketId();
      const reg = await Registration.create({
        user: userId,
        event: event.id,
        type: 'normal',
        ticketId,
        teamName: team.teamName,
        teamId: team.id,
        formResponses: responses || [],
      });
      const payload = {
        ticketId: reg.ticketId,
        eventId: event.id,
        eventName: event.name,
        participantEmail: user.email,
        participantName: user.name || String(userId),
      };
      const qrData = await generateQrDataUrl(payload);
      reg.qrData = qrData;
      await reg.save();
      try {
        await sendTicketEmail({
          to: user.email,
          eventName: event.name,
          eventDate: event.startDate ? new Date(event.startDate).toLocaleString() : 'TBD',
          ticketId,
          qrData,
        });
      } catch (_) {
        // best effort
      }
      registrations.push(reg);
    }

    team.status = 'registered';
    await team.save();

    if (!event.formLocked) {
      event.formLocked = true;
      await event.save();
    }

    res.status(201).json({ message: 'Team registered', registrations, team });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message || 'Team registration failed' });
  }
};

/**
 * GET /api/teams/:eventId/my
 * Get current user's team for an event.
 */
export const getMyTeam = async (req, res) => {
  try {
    ensureParticipant(req.user);
    const { eventId } = req.params;
    const team = await Team.findOne({ event: eventId, 'members.user': req.user.id })
      .populate('members.user', 'name email')
      .populate('leader', 'name email')
      .populate('event', 'name type');
    if (!team) return res.json({ team: null });
    res.json({ team });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to get team' });
  }
};

/**
 * GET /api/teams/event/:eventId/all  (organizer only)
 * Get all teams for an event.
 */
export const getEventTeams = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.organizer) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const teams = await Team.find({ event: eventId })
      .populate('members.user', 'name email')
      .populate('leader', 'name email')
      .sort({ createdAt: -1 });
    res.json({ teams });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch teams' });
  }
};
