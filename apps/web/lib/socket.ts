/**
 * Socket.io Client
 * Real-time messaging client for ImmoFlow
 */
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;
let connectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 5;

/**
 * Initialize Socket.io connection
 */
export function initializeSocket(token: string): Socket {
  // If already connected, return existing socket
  if (socket && socket.connected) {
    return socket;
  }

  // Create new socket connection
  socket = io(API_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('[Socket.io] Connected to server');
    connectionAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.io] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    connectionAttempts++;
    console.error('[Socket.io] Connection error:', error.message);

    if (connectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
      console.error('[Socket.io] Max reconnection attempts reached');
    }
  });

  socket.on('error', (error) => {
    console.error('[Socket.io] Socket error:', error);
  });

  return socket;
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket.io] Manually disconnected');
  }
}

/**
 * Join a conversation room
 */
export function joinConversation(conversationId: string): void {
  if (socket && socket.connected) {
    socket.emit('join:conversation', conversationId);
    console.log(`[Socket.io] Joined conversation: ${conversationId}`);
  }
}

/**
 * Leave a conversation room
 */
export function leaveConversation(conversationId: string): void {
  if (socket && socket.connected) {
    socket.emit('leave:conversation', conversationId);
    console.log(`[Socket.io] Left conversation: ${conversationId}`);
  }
}

/**
 * Send typing indicator
 */
export function sendTypingIndicator(conversationId: string, isTyping: boolean): void {
  if (socket && socket.connected) {
    if (isTyping) {
      socket.emit('typing:start', { conversationId });
    } else {
      socket.emit('typing:stop', { conversationId });
    }
  }
}

/**
 * Listen for new messages
 */
export function onNewMessage(callback: (data: any) => void): void {
  if (socket) {
    socket.on('message:new', callback);
  }
}

/**
 * Remove new message listener
 */
export function offNewMessage(callback: (data: any) => void): void {
  if (socket) {
    socket.off('message:new', callback);
  }
}

/**
 * Listen for unread count updates
 */
export function onUnreadCountUpdate(callback: (data: { unreadCount: number }) => void): void {
  if (socket) {
    socket.on('unread:update', callback);
  }
}

/**
 * Listen for conversation updates
 */
export function onConversationUpdate(callback: (data: any) => void): void {
  if (socket) {
    socket.on('conversation:update', callback);
  }
}

/**
 * Listen for typing indicators
 */
export function onTypingIndicator(
  callback: (data: { userId: string; email: string; conversationId: string }) => void
): void {
  if (socket) {
    socket.on('typing:user', callback);
  }
}

/**
 * Remove typing indicator listener
 */
export function offTypingIndicator(
  callback: (data: { userId: string; email: string; conversationId: string }) => void
): void {
  if (socket) {
    socket.off('typing:user', callback);
  }
}

/**
 * Listen for typing stop
 */
export function onTypingStop(callback: (data: { userId: string; conversationId: string }) => void): void {
  if (socket) {
    socket.on('typing:stop', callback);
  }
}

/**
 * Remove typing stop listener
 */
export function offTypingStop(callback: (data: { userId: string; conversationId: string }) => void): void {
  if (socket) {
    socket.off('typing:stop', callback);
  }
}

/**
 * Remove all event listeners
 */
export function removeAllListeners(): void {
  if (socket) {
    socket.off('message:new');
    socket.off('unread:update');
    socket.off('conversation:update');
    socket.off('typing:user');
    socket.off('typing:stop');
  }
}

/**
 * Remove unread count listener
 */
export function offUnreadCountUpdate(callback: (data: { unreadCount: number }) => void): void {
  if (socket) {
    socket.off('unread:update', callback);
  }
}

/**
 * Remove conversation update listener
 */
export function offConversationUpdate(callback: (data: any) => void): void {
  if (socket) {
    socket.off('conversation:update', callback);
  }
}

// ============================================
// React Hooks for Safe Event Management
// These hooks automatically cleanup listeners on unmount
// ============================================

import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook for safely subscribing to new messages with automatic cleanup
 */
export function useNewMessageListener(callback: (data: any) => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (data: any) => callbackRef.current(data);
    onNewMessage(handler);
    return () => offNewMessage(handler);
  }, []);
}

/**
 * Hook for safely subscribing to unread count updates with automatic cleanup
 */
export function useUnreadCountListener(callback: (data: { unreadCount: number }) => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (data: { unreadCount: number }) => callbackRef.current(data);
    onUnreadCountUpdate(handler);
    return () => offUnreadCountUpdate(handler);
  }, []);
}

/**
 * Hook for safely subscribing to conversation updates with automatic cleanup
 */
export function useConversationUpdateListener(callback: (data: any) => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (data: any) => callbackRef.current(data);
    onConversationUpdate(handler);
    return () => offConversationUpdate(handler);
  }, []);
}

/**
 * Hook for safely subscribing to typing indicators with automatic cleanup
 */
export function useTypingIndicatorListener(
  callback: (data: { userId: string; email: string; conversationId: string }) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (data: { userId: string; email: string; conversationId: string }) =>
      callbackRef.current(data);
    onTypingIndicator(handler);
    return () => offTypingIndicator(handler);
  }, []);
}

/**
 * Hook for managing conversation room membership with automatic leave on unmount
 */
export function useConversationRoom(conversationId: string | null): void {
  useEffect(() => {
    if (!conversationId) return;

    joinConversation(conversationId);
    return () => leaveConversation(conversationId);
  }, [conversationId]);
}

/**
 * Hook for socket initialization and cleanup
 */
export function useSocketConnection(token: string | null): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    socketRef.current = initializeSocket(token);

    return () => {
      removeAllListeners();
      // Note: We don't disconnect here to allow reconnection
      // Call disconnectSocket() explicitly when logging out
    };
  }, [token]);

  return socketRef.current;
}
