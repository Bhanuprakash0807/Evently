import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import app from './app.js';
import User from './models/User.js';
import { initIo } from './utils/socket.js';

const PORT = Number(process.env.PORT) || 5002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/event-platform';

const seedAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    return;
  }

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await User.create({
    name: 'Admin',
    email: adminEmail.toLowerCase().trim(),
    passwordHash,
    role: 'admin',
    isIIIT: false,
  });
};

const start = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    await seedAdmin();

    const server = http.createServer(app);
    const io = initIo(server);

    // Socket.IO: forum rooms
    io.on('connection', (socket) => {
      socket.on('forum:join', (eventId) => {
        socket.join(`forum:${eventId}`);
      });
      socket.on('forum:leave', (eventId) => {
        socket.leave(`forum:${eventId}`);
      });
    });

    server.listen(PORT, () => {
      console.log(`API listening on port ${PORT}`);
    });
  } catch (err) {
    process.stderr.write(`Failed to start server: ${err?.stack || err?.message}\n`);
    process.exit(1);
  }
};

start();
