import { Server } from 'socket.io';

let io = null;

export const initIo = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });
  return io;
};

export const getIo = () => io;
