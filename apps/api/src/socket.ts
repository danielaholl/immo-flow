/**
 * Socket.io Server Setup
 * Real-time messaging infrastructure
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
}

// Store for Socket.io instance (needed for emitting from tRPC)
let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io server
 */
export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: FRONTEND_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket: any, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.log('[Socket.io] Connection rejected: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
      };

      // Attach user info to socket
      socket.userId = decoded.userId;
      socket.email = decoded.email;

      console.log(`[Socket.io] User authenticated: ${decoded.email}`);
      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('[Socket.io] Authentication failed:', errorMessage);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Socket.io] User connected: ${socket.email} (${socket.userId})`);

    // Join user-specific room for targeted messages
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      console.log(`[Socket.io] User ${socket.email} joined room: user:${socket.userId}`);
    }

    // Handle joining conversation rooms
    socket.on('join:conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`[Socket.io] User ${socket.email} joined conversation: ${conversationId}`);
    });

    // Handle leaving conversation rooms
    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`[Socket.io] User ${socket.email} left conversation: ${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:user', {
        userId: socket.userId,
        email: socket.email,
        conversationId,
      });
    });

    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        userId: socket.userId,
        conversationId,
      });
    });

    // Disconnection handler
    socket.on('disconnect', () => {
      console.log(`[Socket.io] User disconnected: ${socket.email} (${socket.userId})`);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`[Socket.io] Socket error for user ${socket.email}:`, error);
    });
  });

  console.log('✅ Socket.io server initialized');
  return io;
}

/**
 * Get Socket.io instance
 */
export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocketServer first.');
  }
  return io;
}

/**
 * Emit new message to conversation participants
 */
export function emitNewMessage(conversationId: string, message: any) {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit('message:new', {
    conversationId,
    message,
  });

  console.log(`[Socket.io] Emitted new message to conversation: ${conversationId}`);
}

/**
 * Emit unread count update to user
 */
export function emitUnreadCountUpdate(userId: string, unreadCount: number) {
  if (!io) return;

  io.to(`user:${userId}`).emit('unread:update', {
    unreadCount,
  });

  console.log(`[Socket.io] Emitted unread count update to user: ${userId} (${unreadCount})`);
}

/**
 * Emit conversation update (last message, etc.)
 */
export function emitConversationUpdate(userId: string, conversation: any) {
  if (!io) return;

  io.to(`user:${userId}`).emit('conversation:update', {
    conversation,
  });

  console.log(`[Socket.io] Emitted conversation update to user: ${userId}`);
}
