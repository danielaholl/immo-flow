/**
 * Security Middleware
 * Implements various security headers and protections
 */
import helmet from './logger.js'helmet';
import { Express } from './logger.js'express';
import { getEnv } from './logger.js'../config/env.js';

/**
 * Configures Helmet security middleware
 */
export function configureSecurityMiddleware(app: Express) {
  const env = getEnv();

  // Apply Helmet with custom configuration
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for Next.js
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'], // Allow images from various sources
          connectSrc: ["'self'", env.FRONTEND_URL], // Allow connections to frontend
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },

      // Cross-Origin Embedder Policy
      crossOriginEmbedderPolicy: false, // Disabled for compatibility

      // Cross-Origin Opener Policy
      crossOriginOpenerPolicy: { policy: 'same-origin' },

      // Cross-Origin Resource Policy
      crossOriginResourcePolicy: { policy: 'cross-origin' },

      // DNS Prefetch Control
      dnsPrefetchControl: { allow: false },

      // Frameguard - prevent clickjacking
      frameguard: { action: 'deny' },

      // Hide powered by header
      hidePoweredBy: true,

      // HTTP Strict Transport Security (HSTS)
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },

      // IE No Open - prevent IE from executing downloads
      ieNoOpen: true,

      // Don't sniff MIME types
      noSniff: true,

      // Referrer Policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

      // X-XSS-Protection (legacy but still useful)
      xssFilter: true,
    })
  );

  console.log('🛡️  Security middleware configured (Helmet)');
}
