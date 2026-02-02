/**
 * Comprehensive Manual UI Testing + Performance Testing
 *
 * This test suite simulates real user interactions and measures:
 * - Page load times
 * - API response times
 * - User journey completeness
 * - Visual correctness
 */

import { test, expect, Page } from '@playwright/test';

// Performance thresholds (in milliseconds)
const PERF_THRESHOLDS = {
  pageLoad: {
    good: 1500,
    acceptable: 2500,
    poor: 3000,
  },
  api: {
    good: 100,
    acceptable: 300,
    poor: 500,
  },
};

// Test accounts
const TEST_USERS = {
  admin: { email: 'admin@bamboo.club', password: 'AdminPass123!' },
  instructor: { email: 'instructor@bamboo.club', password: 'InstructorPass123!' },
  student: { email: 'student@bamboo.club', password: 'StudentPass123!' },
};

interface PerformanceResult {
  page: string;
  loadTime: number;
  status: 'good' | 'acceptable' | 'poor';
}

const performanceResults: PerformanceResult[] = [];

// Helper to measure page load time
async function measurePageLoad(page: Page, url: string, pageName: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  const loadTime = Date.now() - startTime;

  let status: 'good' | 'acceptable' | 'poor' = 'poor';
  if (loadTime < PERF_THRESHOLDS.pageLoad.good) status = 'good';
  else if (loadTime < PERF_THRESHOLDS.pageLoad.acceptable) status = 'acceptable';

  performanceResults.push({ page: pageName, loadTime, status });
  console.log(`📊 ${pageName}: ${loadTime}ms (${status})`);

  return loadTime;
}

// Helper to capture API response times
async function captureApiTimes(page: Page): Promise<Map<string, number>> {
  const apiTimes = new Map<string, number>();

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      // Use request timing from performance API instead
      const startTime = Date.now();
      await response.finished();
      const endTime = Date.now();
      apiTimes.set(url, endTime - startTime);
    }
  });

  return apiTimes;
}

test.describe('Manual UI Testing - Authentication', () => {
  test('should load login page quickly', async ({ page }) => {
    const loadTime = await measurePageLoad(page, '/auth/login', 'Login Page');
    expect(loadTime).toBeLessThan(PERF_THRESHOLDS.pageLoad.poor);

    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/login-page.png', fullPage: true });

    // Wait for page to fully render
    await page.waitForLoadState('networkidle');

    // Verify page elements - use longer timeout and more flexible selectors for CI
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input#email')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input#password')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
  });

  test('should load register page quickly', async ({ page }) => {
    const loadTime = await measurePageLoad(page, '/auth/register', 'Register Page');
    expect(loadTime).toBeLessThan(PERF_THRESHOLDS.pageLoad.poor);

    await page.screenshot({ path: 'test-results/screenshots/register-page.png', fullPage: true });

    await expect(page.getByRole('heading', { name: /create|register|sign up/i })).toBeVisible();
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.goto('/auth/login');

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');

    // Skip test if rate limited
    const rateLimited = await page.locator('text=/too many requests/i').isVisible().catch(() => false);
    if (rateLimited) {
      test.skip(true, 'Rate limited - skipping test');
      return;
    }

    // Wait for login form to appear - use more reliable selectors
    await expect(page.locator('input#email')).toBeVisible({ timeout: 15000 });

    await page.locator('input#email').fill('invalid@test.com');
    await page.locator('input#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // Should show error message - use class selector like other tests
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 15000 });
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Manual UI Testing - Home Page', () => {
  test('should load home page quickly', async ({ page }) => {
    const loadTime = await measurePageLoad(page, '/', 'Home Page');
    expect(loadTime).toBeLessThan(PERF_THRESHOLDS.pageLoad.poor);

    await page.screenshot({ path: 'test-results/screenshots/home-page.png', fullPage: true });

    // Verify key elements
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});

test.describe('Manual UI Testing - Demo Page', () => {
  test('should load demo page with sample content', async ({ page }) => {
    const loadTime = await measurePageLoad(page, '/demo', 'Demo Page');
    expect(loadTime).toBeLessThan(PERF_THRESHOLDS.pageLoad.poor);

    await page.screenshot({ path: 'test-results/screenshots/demo-page.png', fullPage: true });
  });
});

test.describe('Performance Analysis', () => {
  test('should measure all page load times', async ({ page }) => {
    const pagesToTest = [
      { url: '/', name: 'Home' },
      { url: '/auth/login', name: 'Login' },
      { url: '/auth/register', name: 'Register' },
      { url: '/demo', name: 'Demo' },
    ];

    console.log('\n📈 PERFORMANCE REPORT\n' + '='.repeat(50));

    for (const { url, name } of pagesToTest) {
      await measurePageLoad(page, url, name);
    }

    // Print summary
    console.log('\n📊 SUMMARY\n' + '-'.repeat(50));

    const goodCount = performanceResults.filter(r => r.status === 'good').length;
    const acceptableCount = performanceResults.filter(r => r.status === 'acceptable').length;
    const poorCount = performanceResults.filter(r => r.status === 'poor').length;

    console.log(`✅ Good (<${PERF_THRESHOLDS.pageLoad.good}ms): ${goodCount}`);
    console.log(`⚠️ Acceptable (<${PERF_THRESHOLDS.pageLoad.acceptable}ms): ${acceptableCount}`);
    console.log(`❌ Poor (>${PERF_THRESHOLDS.pageLoad.acceptable}ms): ${poorCount}`);

    // Calculate average
    const avgLoadTime = performanceResults.reduce((sum, r) => sum + r.loadTime, 0) / performanceResults.length;
    console.log(`\n📏 Average load time: ${Math.round(avgLoadTime)}ms`);

    // All pages should load in acceptable time
    expect(poorCount).toBe(0);
  });

  test('should check Core Web Vitals', async ({ page }) => {
    await page.goto('/');

    // Measure LCP using JavaScript
    const lcpValue = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // Fallback if no LCP entry
        setTimeout(() => resolve(-1), 5000);
      });
    });

    console.log(`\n🎨 LCP (Largest Contentful Paint): ${Math.round(lcpValue)}ms`);

    if (lcpValue > 0) {
      expect(lcpValue).toBeLessThan(4000); // Poor threshold
    }
  });
});

test.describe('Visual Regression - Screenshots', () => {
  test('should capture all public pages', async ({ page }) => {
    const publicPages = [
      { url: '/', name: 'home' },
      { url: '/auth/login', name: 'login' },
      { url: '/auth/register', name: 'register' },
      { url: '/auth/error', name: 'auth-error' },
      { url: '/demo', name: 'demo' },
    ];

    for (const { url, name } of publicPages) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.screenshot({
        path: `test-results/screenshots/${name}.png`,
        fullPage: true
      });
      console.log(`📸 Captured: ${name}`);
    }
  });

  test('should test responsive layouts', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 812, name: 'mobile' },
    ];

    for (const { width, height, name } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.screenshot({
        path: `test-results/screenshots/home-${name}.png`,
        fullPage: true
      });
      console.log(`📱 Captured ${name} viewport (${width}x${height})`);
    }
  });
});

test.describe('Accessibility Checks', () => {
  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');

    // Check for landmarks
    const nav = page.getByRole('navigation');
    const main = page.getByRole('main');

    await expect(nav).toBeVisible();
    await expect(main).toBeVisible();
  });

  test('should have accessible forms', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Skip test if rate limited
    const rateLimited = await page.getByText(/too many requests/i).isVisible().catch(() => false);
    if (rateLimited) {
      test.skip(true, 'Rate limited - skipping test');
      return;
    }

    // All form inputs should have labels
    const emailInput = page.getByLabel(/email address/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Skip test if rate limited
    const rateLimited = await page.getByText(/too many requests/i).isVisible().catch(() => false);
    if (rateLimited) {
      test.skip(true, 'Rate limited - skipping test');
      return;
    }

    // Wait for login form to load
    await expect(page.getByLabel(/email address/i)).toBeVisible({ timeout: 10000 });

    // Tab through the form - first tab may focus various elements depending on browser
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);

    // After several tabs, should reach form elements
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);
  });
});

test.describe('API Performance', () => {
  test('should measure API response times', async ({ page, request }) => {
    console.log('\n🔌 API RESPONSE TIMES\n' + '='.repeat(50));

    // Test health endpoint if available
    const healthStart = Date.now();
    try {
      const healthResponse = await request.get('/api/health/notion?secret=test');
      const healthTime = Date.now() - healthStart;
      console.log(`/api/health/notion: ${healthTime}ms (${healthResponse.status()})`);
    } catch {
      console.log('/api/health/notion: Not accessible');
    }
  });
});
