import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import organizerRoutes from './routes/organizerRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import forumRoutes from './routes/forumRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

const allowedOrigin = process.env.FRONTEND_URL;
if (!allowedOrigin) {
	throw new Error('FRONTEND_URL is not configured');
}

app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/forum', forumRoutes);

app.use(errorHandler);

export default app;
