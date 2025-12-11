/**
 * Auth Router Tests
 * Tests for authentication functionality
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from './logger.js'vitest';
import { pool } from './logger.js'../../db.js';
import { createCaller } from './logger.js'../helpers.js';
import jwt from './logger.js'jsonwebtoken';
import { getEnv } from './logger.js'../../config/env.js';

const env = getEnv();

describe('Auth Router', () => {
  const testEmail = 'test-auth@example.com';
  const testPassword = 'SecurePass123';

  beforeAll(async () => {
    // Setup test database - clean up any existing test users
    await pool.query("DELETE FROM users WHERE email LIKE 'test%@example.com'");
  });

  afterAll(async () => {
    // Cleanup
    await pool.query("DELETE FROM users WHERE email LIKE 'test%@example.com'");
  });

  beforeEach(async () => {
    // Clean before each test
    await pool.query("DELETE FROM users WHERE email = $1", [testEmail]);
  });

  describe('Input Validation', () => {
    it('should reject invalid email format', async () => {
      const caller = createCaller();

      await expect(
        caller.auth.register({
          email: 'not-an-email',
          password: testPassword,
        })
      ).rejects.toThrow();
    });

    it('should reject weak password (too short)', async () => {
      const caller = createCaller();

      await expect(
        caller.auth.register({
          email: testEmail,
          password: 'Short1',
        })
      ).rejects.toThrow(/at least 8 characters/i);
    });

    it('should reject password without uppercase', async () => {
      const caller = createCaller();

      await expect(
        caller.auth.register({
          email: testEmail,
          password: 'weakpass123',
        })
      ).rejects.toThrow(/uppercase/i);
    });

    it('should reject password without lowercase', async () => {
      const caller = createCaller();

      await expect(
        caller.auth.register({
          email: testEmail,
          password: 'WEAKPASS123',
        })
      ).rejects.toThrow(/lowercase/i);
    });

    it('should reject password without number', async () => {
      const caller = createCaller();

      await expect(
        caller.auth.register({
          email: testEmail,
          password: 'WeakPassword',
        })
      ).rejects.toThrow(/number/i);
    });
  });

  describe('Registration', () => {
    it('should create new user with valid credentials', async () => {
      const caller = createCaller();

      const result = await caller.auth.register({
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should reject duplicate email', async () => {
      const caller = createCaller();

      // Register first user
      await caller.auth.register({
        email: testEmail,
        password: testPassword,
      });

      // Try to register again with same email
      await expect(
        caller.auth.register({
          email: testEmail,
          password: 'DifferentPass123',
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('should hash password before storing', async () => {
      const caller = createCaller();

      await caller.auth.register({
        email: testEmail,
        password: testPassword,
      });

      // Check database directly
      const user = await pool.query(
        'SELECT password_hash FROM users WHERE email = $1',
        [testEmail]
      );

      expect(user.rows[0]).toBeDefined();
      expect(user.rows[0].password_hash).toBeDefined();
      // Password hash should NOT be the plain password
      expect(user.rows[0].password_hash).not.toBe(testPassword);
      // Bcrypt hashes start with $2b$
      expect(user.rows[0].password_hash).toMatch(/^\$2[ayb]\$/);
    });

    it('should generate valid JWT token', async () => {
      const caller = createCaller();

      const result = await caller.auth.register({
        email: testEmail,
        password: testPassword,
      });

      // Verify token can be decoded
      const decoded = jwt.verify(result.token, env.JWT_SECRET) as {
        userId: string;
        email: string;
        exp: number;
      };

      expect(decoded.userId).toBe(result.user.id);
      expect(decoded.email).toBe(testEmail);
      expect(decoded.exp).toBeDefined();

      // Token should expire in 7 days (604800 seconds)
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;
      expect(expiresIn).toBeGreaterThan(604700); // ~7 days
      expect(expiresIn).toBeLessThan(604900);
    });

    it('should create user profile', async () => {
      const caller = createCaller();

      const result = await caller.auth.register({
        email: testEmail,
        password: testPassword,
        firstName: 'John',
        lastName: 'Doe',
      });

      // Check profile was created
      const profile = await pool.query(
        'SELECT * FROM user_profiles WHERE user_id = $1',
        [result.user.id]
      );

      expect(profile.rows[0]).toBeDefined();
      expect(profile.rows[0].first_name).toBe('John');
      expect(profile.rows[0].last_name).toBe('Doe');
    });
  });

  describe('Login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const caller = createCaller();
      await caller.auth.register({
        email: testEmail,
        password: testPassword,
      });
    });

    it('should login with correct credentials', async () => {
      const caller = createCaller();

      const result = await caller.auth.login({
        email: testEmail,
        password: testPassword,
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect(result.token).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const caller = createCaller();

      await expect(
        caller.auth.login({
          email: testEmail,
          password: 'WrongPassword123',
        })
      ).rejects.toThrow(/invalid credentials/i);
    });

    it('should reject non-existent user', async () => {
      const caller = createCaller();

      await expect(
        caller.auth.login({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
      ).rejects.toThrow(/invalid credentials/i);
    });

    it('should be case-insensitive for email', async () => {
      const caller = createCaller();

      const result = await caller.auth.login({
        email: testEmail.toUpperCase(),
        password: testPassword,
      });

      expect(result.user.email).toBe(testEmail);
    });
  });

  describe('Security', () => {
    it('should not expose password hash in response', async () => {
      const caller = createCaller();

      const result = await caller.auth.register({
        email: testEmail,
        password: testPassword,
      });

      // Check that password_hash is not in response
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(result)).not.toContain('password_hash');
    });

    it('should use secure JWT secret', () => {
      // JWT secret should be at least 32 characters
      const secret = env.JWT_SECRET;
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThanOrEqual(32);
    });

    it('should trim and lowercase email', async () => {
      const caller = createCaller();

      await caller.auth.register({
        email: '  ' + testEmail.toUpperCase() + '  ',
        password: testPassword,
      });

      const user = await pool.query('SELECT email FROM users WHERE email = $1', [testEmail]);

      expect(user.rows[0].email).toBe(testEmail);
    });
  });
});
