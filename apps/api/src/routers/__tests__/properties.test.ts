/**
 * Properties Router Tests
 * Tests for property CRUD operations
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from './logger.js'vitest';
import { pool } from './logger.js'../../db.js';
import { createCaller, createAuthenticatedCaller } from './logger.js'../helpers.js';

describe('Properties Router', () => {
  let testUserId: string;
  let testPropertyId: string;
  const testEmail = 'test-property@example.com';

  beforeAll(async () => {
    // Create a test user
    await pool.query("DELETE FROM users WHERE email LIKE 'test%@example.com'");

    const user = await pool.query(
      `INSERT INTO users (email, password_hash, email_confirmed)
       VALUES ($1, $2, true)
       RETURNING id`,
      [testEmail, '$2b$10$test.hash']
    );
    testUserId = user.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await pool.query("DELETE FROM properties WHERE user_id = $1", [testUserId]);
    await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
  });

  beforeEach(async () => {
    // Clean properties before each test
    await pool.query("DELETE FROM properties WHERE user_id = $1", [testUserId]);
  });

  describe('getAll', () => {
    it('should return empty array when no properties exist', async () => {
      const caller = createCaller();
      const result = await caller.properties.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return active properties', async () => {
      // Create test property
      await pool.query(
        `INSERT INTO properties (user_id, title, price, location, sqm, rooms, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [testUserId, 'Test Property', 200000, 'Berlin', 80, 3]
      );

      const caller = createCaller();
      const result = await caller.properties.getAll();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title).toBe('Test Property');
      expect(result[0].status).toBe('active');
    });

    it('should filter by location', async () => {
      await pool.query(
        `INSERT INTO properties (user_id, title, price, location, sqm, rooms, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [testUserId, 'Berlin Property', 200000, 'Berlin', 80, 3]
      );

      await pool.query(
        `INSERT INTO properties (user_id, title, price, location, sqm, rooms, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [testUserId, 'Munich Property', 300000, 'Munich', 90, 4]
      );

      const caller = createCaller();
      const result = await caller.properties.getAll({ location: 'Berlin' });

      expect(result.length).toBe(1);
      expect(result[0].location).toContain('Berlin');
    });

    it('should filter by price range', async () => {
      await pool.query(
        `INSERT INTO properties (user_id, title, price, location, sqm, rooms, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [testUserId, 'Cheap Property', 100000, 'Berlin', 50, 2]
      );

      await pool.query(
        `INSERT INTO properties (user_id, title, price, location, sqm, rooms, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [testUserId, 'Expensive Property', 500000, 'Berlin', 120, 5]
      );

      const caller = createCaller();
      const result = await caller.properties.getAll({
        minPrice: 150000,
        maxPrice: 600000,
      });

      expect(result.length).toBe(1);
      expect(result[0].price).toBe(500000);
    });

    it('should respect limit parameter', async () => {
      // Create 5 properties
      for (let i = 0; i < 5; i++) {
        await pool.query(
          `INSERT INTO properties (user_id, title, price, location, sqm, rooms, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
          [testUserId, `Property ${i}`, 200000, 'Berlin', 80, 3]
        );
      }

      const caller = createCaller();
      const result = await caller.properties.getAll({ limit: 3 });

      expect(result.length).toBe(3);
    });
  });

  describe('getById', () => {
    beforeEach(async () => {
      const property = await pool.query(
        `INSERT INTO properties (user_id, title, price, location, sqm, rooms, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING id`,
        [testUserId, 'Test Property', 200000, 'Berlin', 80, 3]
      );
      testPropertyId = property.rows[0].id;
    });

    it('should return property by ID', async () => {
      const caller = createCaller();
      const result = await caller.properties.getById({ id: testPropertyId });

      expect(result).toBeDefined();
      expect(result.id).toBe(testPropertyId);
      expect(result.title).toBe('Test Property');
    });

    it('should throw error for non-existent property', async () => {
      const caller = createCaller();
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        caller.properties.getById({ id: fakeId })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('create', () => {
    it('should create property when authenticated', async () => {
      const caller = createAuthenticatedCaller(testUserId, testEmail);

      const result = await caller.properties.create({
        title: 'New Property',
        description: 'A beautiful apartment',
        price: 250000,
        location: 'Berlin',
        sqm: 85,
        rooms: 3,
        property_type: 'apartment',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('New Property');
      expect(result.user_id).toBe(testUserId);
    });

    it('should reject when not authenticated', async () => {
      const caller = createCaller();

      await expect(
        caller.properties.create({
          title: 'New Property',
          price: 250000,
          location: 'Berlin',
          sqm: 85,
          rooms: 3,
        })
      ).rejects.toThrow(/unauthorized/i);
    });

    it('should sanitize HTML in title', async () => {
      const caller = createAuthenticatedCaller(testUserId, testEmail);

      const result = await caller.properties.create({
        title: '<script>alert("xss")</script>Clean Title',
        price: 250000,
        location: 'Berlin',
        sqm: 85,
        rooms: 3,
      });

      expect(result.title).not.toContain('<script>');
      expect(result.title).toContain('Clean Title');
    });

    it('should validate required fields', async () => {
      const caller = createAuthenticatedCaller(testUserId, testEmail);

      await expect(
        caller.properties.create({
          title: 'ab', // Too short (min 3)
          price: 250000,
          location: 'Berlin',
          sqm: 85,
          rooms: 3,
        })
      ).rejects.toThrow();
    });

    it('should validate price is positive', async () => {
      const caller = createAuthenticatedCaller(testUserId, testEmail);

      await expect(
        caller.properties.create({
          title: 'Test Property',
          price: -1000, // Negative price
          location: 'Berlin',
          sqm: 85,
          rooms: 3,
        })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      const property = await pool.query(
        `INSERT INTO properties (user_id, title, price, location, sqm, rooms, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING id`,
        [testUserId, 'Test Property', 200000, 'Berlin', 80, 3]
      );
      testPropertyId = property.rows[0].id;
    });

    it('should update property when owner', async () => {
      const caller = createAuthenticatedCaller(testUserId, testEmail);

      const result = await caller.properties.update({
        id: testPropertyId,
        title: 'Updated Title',
        price: 220000,
      });

      expect(result.title).toBe('Updated Title');
      expect(result.price).toBe(220000);
      // Other fields should remain unchanged
      expect(result.location).toBe('Berlin');
    });

    it('should reject update when not owner', async () => {
      // Create another user
      const otherUser = await pool.query(
        `INSERT INTO users (email, password_hash, email_confirmed)
         VALUES ($1, $2, true)
         RETURNING id`,
        ['other@example.com', '$2b$10$test.hash']
      );

      const caller = createAuthenticatedCaller(otherUser.rows[0].id, 'other@example.com');

      await expect(
        caller.properties.update({
          id: testPropertyId,
          title: 'Hacked Title',
        })
      ).rejects.toThrow(/unauthorized/i);

      // Cleanup
      await pool.query("DELETE FROM users WHERE id = $1", [otherUser.rows[0].id]);
    });

    it('should only update whitelisted fields', async () => {
      const caller = createAuthenticatedCaller(testUserId, testEmail);

      // Try to update user_id (should be ignored)
      const result = await caller.properties.update({
        id: testPropertyId,
        title: 'New Title',
        // @ts-expect-error - testing runtime behavior
        user_id: '00000000-0000-0000-0000-000000000000',
      });

      expect(result.user_id).toBe(testUserId); // Should not change
      expect(result.title).toBe('New Title'); // Should change
    });

    it('should sanitize updated fields', async () => {
      const caller = createAuthenticatedCaller(testUserId, testEmail);

      const result = await caller.properties.update({
        id: testPropertyId,
        description: '<script>alert("xss")</script><p>Safe content</p>',
      });

      expect(result.description).not.toContain('<script>');
      expect(result.description).toContain('Safe content');
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      const property = await pool.query(
        `INSERT INTO properties (user_id, title, price, location, sqm, rooms, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING id`,
        [testUserId, 'Test Property', 200000, 'Berlin', 80, 3]
      );
      testPropertyId = property.rows[0].id;
    });

    it('should delete property when owner', async () => {
      const caller = createAuthenticatedCaller(testUserId, testEmail);

      const result = await caller.properties.delete({
        id: testPropertyId,
        reason: 'sold',
        soldPrice: 210000,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Verify property is deleted
      const check = await pool.query('SELECT * FROM properties WHERE id = $1', [testPropertyId]);
      expect(check.rows.length).toBe(0);
    });

    it('should reject delete when not owner', async () => {
      // Create another user
      const otherUser = await pool.query(
        `INSERT INTO users (email, password_hash, email_confirmed)
         VALUES ($1, $2, true)
         RETURNING id`,
        ['other2@example.com', '$2b$10$test.hash']
      );

      const caller = createAuthenticatedCaller(otherUser.rows[0].id, 'other2@example.com');

      await expect(
        caller.properties.delete({
          id: testPropertyId,
        })
      ).rejects.toThrow(/unauthorized/i);

      // Cleanup
      await pool.query("DELETE FROM users WHERE id = $1", [otherUser.rows[0].id]);
    });

    it('should require authentication', async () => {
      const caller = createCaller();

      await expect(
        caller.properties.delete({
          id: testPropertyId,
        })
      ).rejects.toThrow(/unauthorized/i);
    });
  });

  describe('getMine', () => {
    it('should return only user\'s properties', async () => {
      // Create properties for test user
      await pool.query(
        `INSERT INTO properties (user_id, title, price, location, sqm, rooms, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [testUserId, 'My Property 1', 200000, 'Berlin', 80, 3]
      );

      await pool.query(
        `INSERT INTO properties (user_id, title, price, location, sqm, rooms, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [testUserId, 'My Property 2', 250000, 'Munich', 90, 4]
      );

      // Create property for another user
      const otherUser = await pool.query(
        `INSERT INTO users (email, password_hash, email_confirmed)
         VALUES ($1, $2, true)
         RETURNING id`,
        ['other3@example.com', '$2b$10$test.hash']
      );

      await pool.query(
        `INSERT INTO properties (user_id, title, price, location, sqm, rooms, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [otherUser.rows[0].id, 'Other Property', 300000, 'Hamburg', 100, 5]
      );

      const caller = createAuthenticatedCaller(testUserId, testEmail);
      const result = await caller.properties.getMine();

      expect(result.length).toBe(2);
      expect(result.every(p => p.user_id === testUserId)).toBe(true);

      // Cleanup
      await pool.query("DELETE FROM properties WHERE user_id = $1", [otherUser.rows[0].id]);
      await pool.query("DELETE FROM users WHERE id = $1", [otherUser.rows[0].id]);
    });

    it('should require authentication', async () => {
      const caller = createCaller();

      await expect(
        caller.properties.getMine()
      ).rejects.toThrow(/unauthorized/i);
    });
  });
});
