import { Server as IOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

let io = null;
let _redisPubClient = null;

export function initIO(httpServer) {
  if (io) return io;
  io = new IOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // If REDIS_URL is provided, set up the Redis adapter using node-redis
  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      // connect clients asynchronously, attach adapter when ready
      (async () => {
        try {
          await pubClient.connect();
          await subClient.connect();
          // expose the pubClient for other modules to reuse if needed
          _redisPubClient = pubClient;
          io.adapter(createAdapter(pubClient, subClient));
          console.log('Socket.IO Redis adapter connected');
        } catch (err) {
          console.error('Failed to connect Redis for Socket.IO adapter', err);
        }
      })();
    } catch (err) {
      console.error('Error setting up Redis adapter', err);
    }
  }

  // optional authentication middleware: attach userId if token provided
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (err) {
      return next();
    }
  });

  io.on('connection', (socket) => {
    if (socket.userId) socket.join(`user:${socket.userId}`);
    socket.on('disconnect', () => {});
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function getAdapterPubClient() {
  return _redisPubClient;
}
