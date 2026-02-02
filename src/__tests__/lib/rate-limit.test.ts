/**
 * Tests for rate limiting functionality
 * Verifies brute force protection and request throttling
 */

import {
  checkRateLimit,
  getClientIP,
  RATE_LIMITS,
  type RateLimitConfig,
  type RateLimitResult,
} from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  // Use unique identifiers per test to avoid cross-test contamination
  const getUniqueId = () => `test-${Date.now()}-${Math.random()}`;

  describe('checkRateLimit', () => {
    it('should allow first request within limit', () => {
      const identifier = getUniqueId();
      const config: RateLimitConfig = { limit: 5, windowSeconds: 60 };

      const result = checkRateLimit(identifier, config);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1 = 4 remaining
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should decrement remaining count with each request', () => {
      const identifier = getUniqueId();
      const config: RateLimitConfig = { limit: 5, windowSeconds: 60 };

      const result1 = checkRateLimit(identifier, config);
      expect(result1.remaining).toBe(4);

      const result2 = checkRateLimit(identifier, config);
      expect(result2.remaining).toBe(3);

      const result3 = checkRateLimit(identifier, config);
      expect(result3.remaining).toBe(2);
    });

    it('should block requests after limit is exceeded', () => {
      const identifier = getUniqueId();
      const config: RateLimitConfig = { limit: 3, windowSeconds: 60 };

      // Make 3 allowed requests
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);

      // 4th request should be blocked
      const result = checkRateLimit(identifier, config);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different identifiers separately', () => {
      const identifier1 = getUniqueId();
      const identifier2 = getUniqueId();
      const config: RateLimitConfig = { limit: 2, windowSeconds: 60 };

      // Use up limit for identifier1
      checkRateLimit(identifier1, config);
      checkRateLimit(identifier1, config);
      const result1 = checkRateLimit(identifier1, config);
      expect(result1.success).toBe(false);

      // identifier2 should still have full limit
      const result2 = checkRateLimit(identifier2, config);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(1);
    });

    it('should reset count after window expires', async () => {
      const identifier = getUniqueId();
      // Use a very short window for testing
      const config: RateLimitConfig = { limit: 2, windowSeconds: 1 };

      // Use up the limit
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);
      const blockedResult = checkRateLimit(identifier, config);
      expect(blockedResult.success).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be allowed again
      const newResult = checkRateLimit(identifier, config);
      expect(newResult.success).toBe(true);
      expect(newResult.remaining).toBe(1);
    });

    it('should return correct resetTime', () => {
      const identifier = getUniqueId();
      const windowSeconds = 60;
      const config: RateLimitConfig = { limit: 5, windowSeconds };

      const before = Date.now();
      const result = checkRateLimit(identifier, config);
      const after = Date.now();

      // Reset time should be approximately windowSeconds in the future
      expect(result.resetTime).toBeGreaterThanOrEqual(before + windowSeconds * 1000);
      expect(result.resetTime).toBeLessThanOrEqual(after + windowSeconds * 1000 + 100);
    });

    it('should handle limit of 1 (single request allowed)', () => {
      const identifier = getUniqueId();
      const config: RateLimitConfig = { limit: 1, windowSeconds: 60 };

      const result1 = checkRateLimit(identifier, config);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(0);

      const result2 = checkRateLimit(identifier, config);
      expect(result2.success).toBe(false);
    });

    it('should handle high limits correctly', () => {
      const identifier = getUniqueId();
      const config: RateLimitConfig = { limit: 1000, windowSeconds: 60 };

      const result = checkRateLimit(identifier, config);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999);
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' },
      });

      expect(getClientIP(request)).toBe('192.168.1.100');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '192.168.1.200' },
      });

      expect(getClientIP(request)).toBe('192.168.1.200');
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'x-real-ip': '192.168.1.200',
        },
      });

      expect(getClientIP(request)).toBe('192.168.1.100');
    });

    it('should return localhost fallback when no IP headers present', () => {
      const request = new Request('http://localhost');

      expect(getClientIP(request)).toBe('127.0.0.1');
    });

    it('should handle whitespace in x-forwarded-for', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '  192.168.1.100  ,  10.0.0.1  ' },
      });

      expect(getClientIP(request)).toBe('192.168.1.100');
    });

    it('should handle single IP in x-forwarded-for', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '203.0.113.50' },
      });

      expect(getClientIP(request)).toBe('203.0.113.50');
    });

    it('should handle IPv6 addresses', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '2001:db8::1' },
      });

      expect(getClientIP(request)).toBe('2001:db8::1');
    });
  });

  describe('RATE_LIMITS presets', () => {
    it('should have strict limits for login', () => {
      expect(RATE_LIMITS.login.limit).toBe(5);
      expect(RATE_LIMITS.login.windowSeconds).toBe(60);
    });

    it('should have strict limits for register', () => {
      expect(RATE_LIMITS.register.limit).toBe(3);
      expect(RATE_LIMITS.register.windowSeconds).toBe(60);
    });

    it('should have generous limits for general API', () => {
      expect(RATE_LIMITS.api.limit).toBe(100);
      expect(RATE_LIMITS.api.windowSeconds).toBe(60);
    });

    it('should have moderate limits for admin', () => {
      expect(RATE_LIMITS.admin.limit).toBe(50);
      expect(RATE_LIMITS.admin.windowSeconds).toBe(60);
    });

    it('should have login limit lower than API limit (security)', () => {
      expect(RATE_LIMITS.login.limit).toBeLessThan(RATE_LIMITS.api.limit);
    });

    it('should have register limit lower than login limit (spam prevention)', () => {
      expect(RATE_LIMITS.register.limit).toBeLessThan(RATE_LIMITS.login.limit);
    });
  });

  describe('Rate limit integration scenarios', () => {
    it('should protect against brute force login attempts', () => {
      const attackerIP = getUniqueId();
      const results: RateLimitResult[] = [];

      // Simulate 10 rapid login attempts
      for (let i = 0; i < 10; i++) {
        results.push(checkRateLimit(attackerIP, RATE_LIMITS.login));
      }

      // First 5 should succeed
      expect(results.slice(0, 5).every((r) => r.success)).toBe(true);

      // Remaining should be blocked
      expect(results.slice(5).every((r) => !r.success)).toBe(true);
    });

    it('should protect against registration spam', () => {
      const spammerIP = getUniqueId();
      const results: RateLimitResult[] = [];

      // Simulate 5 rapid registration attempts
      for (let i = 0; i < 5; i++) {
        results.push(checkRateLimit(spammerIP, RATE_LIMITS.register));
      }

      // First 3 should succeed
      expect(results.slice(0, 3).every((r) => r.success)).toBe(true);

      // Remaining should be blocked
      expect(results.slice(3).every((r) => !r.success)).toBe(true);
    });

    it('should allow normal API usage patterns', () => {
      const normalUser = getUniqueId();
      const results: RateLimitResult[] = [];

      // Simulate 50 API requests (normal usage)
      for (let i = 0; i < 50; i++) {
        results.push(checkRateLimit(normalUser, RATE_LIMITS.api));
      }

      // All should succeed (limit is 100)
      expect(results.every((r) => r.success)).toBe(true);
      expect(results[49].remaining).toBe(50);
    });
  });
});
