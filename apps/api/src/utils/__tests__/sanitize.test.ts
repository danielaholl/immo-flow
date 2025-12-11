/**
 * Sanitization Tests
 * Tests for XSS protection and input sanitization
 */
import { describe, it, expect } from './logger.js'vitest';
import {
  sanitizeHtml,
  sanitizePlainText,
  sanitizeRichText,
  isSafeFieldName,
  isAllowedPropertyField,
} from './logger.js'../sanitize.js';

describe('Sanitization Utilities', () => {
  describe('sanitizePlainText', () => {
    it('should remove all HTML tags', () => {
      const input = '<script>alert("XSS")</script>Hello World';
      const output = sanitizePlainText(input);
      expect(output).toBe('Hello World');
      expect(output).not.toContain('<script>');
    });

    it('should handle nested HTML', () => {
      const input = '<div><p>Text<script>evil()</script></p></div>';
      const output = sanitizePlainText(input);
      expect(output).toBe('Text');
    });

    it('should preserve plain text', () => {
      const input = 'Just plain text';
      const output = sanitizePlainText(input);
      expect(output).toBe('Just plain text');
    });
  });

  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const input = '<b>Bold</b> and <i>Italic</i>';
      const output = sanitizeHtml(input);
      expect(output).toContain('<b>');
      expect(output).toContain('<i>');
    });

    it('should remove dangerous tags', () => {
      const input = '<script>alert("XSS")</script><b>Safe</b>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('<script>');
      expect(output).toContain('<b>Safe</b>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="evil()">Click</div>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('onclick');
    });
  });

  describe('sanitizeRichText', () => {
    it('should allow rich formatting tags', () => {
      const input = '<h1>Title</h1><p>Paragraph</p><a href="https://example.com">Link</a>';
      const output = sanitizeRichText(input);
      expect(output).toContain('<h1>');
      expect(output).toContain('<a');
      expect(output).toContain('href');
    });

    it('should sanitize malicious links', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const output = sanitizeRichText(input);
      expect(output).not.toContain('javascript:');
    });
  });

  describe('isSafeFieldName', () => {
    it('should accept valid field names', () => {
      expect(isSafeFieldName('title')).toBe(true);
      expect(isSafeFieldName('user_id')).toBe(true);
      expect(isSafeFieldName('_private')).toBe(true);
      expect(isSafeFieldName('field123')).toBe(true);
    });

    it('should reject invalid field names', () => {
      expect(isSafeFieldName('field-name')).toBe(false); // hyphen
      expect(isSafeFieldName('field.name')).toBe(false); // dot
      expect(isSafeFieldName('field name')).toBe(false); // space
      expect(isSafeFieldName('field;DROP TABLE')).toBe(false); // SQL injection
      expect(isSafeFieldName('123field')).toBe(false); // starts with number
    });
  });

  describe('isAllowedPropertyField', () => {
    it('should accept whitelisted fields', () => {
      expect(isAllowedPropertyField('title')).toBe(true);
      expect(isAllowedPropertyField('price')).toBe(true);
      expect(isAllowedPropertyField('description')).toBe(true);
    });

    it('should reject non-whitelisted fields', () => {
      expect(isAllowedPropertyField('id')).toBe(false);
      expect(isAllowedPropertyField('user_id')).toBe(false);
      expect(isAllowedPropertyField('created_at')).toBe(false);
      expect(isAllowedPropertyField('malicious_field')).toBe(false);
    });
  });
});
