/**
 * Express Server with tRPC
 * Main entry point for the API
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router.js';
import { createContext } from './trpc.js';
import { testConnection } from './db.js';
import uploadRoutes from './routes/upload.js';
import { apiRateLimiter, authRateLimiter } from './middleware/rateLimit.js';
import { initializeSocketServer } from './socket.js';
import { stripeWebhookRouter } from './webhooks/stripe.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Stripe webhook needs raw body for signature verification
// Must be before express.json() middleware
app.use('/webhooks', express.raw({ type: 'application/json' }), stripeWebhookRouter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from uploads directory
const uploadsPath = path.join(process.cwd(), '../../public/uploads');
app.use('/uploads', express.static(uploadsPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload routes
app.use('/upload', uploadRoutes);

// Apply rate limiting to tRPC endpoints based on procedure path
app.use('/trpc', (req, res, next) => {
  // Get the tRPC procedure path from the URL
  const path = req.path || req.url;

  // Apply strict rate limiting to auth endpoints
  if (path.includes('auth.login') || path.includes('auth.register')) {
    return authRateLimiter(req, res, next);
  }

  // Apply general rate limiting to all other endpoints
  return apiRateLimiter(req, res, next);
});

// tRPC endpoint
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Start server
async function startServer() {
  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('❌ Failed to connect to database. Exiting...');
    process.exit(1);
  }

  // Initialize Socket.io
  initializeSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`);
    console.log(`🔌 Socket.io ready for WebSocket connections`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
  });
}

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
