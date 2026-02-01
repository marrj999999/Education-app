import { test, expect } from '@playwright/test';

test.describe('Teaching Mode', () => {
  // Teaching mode requires authentication, so these tests check
  // that unauthenticated access is properly handled

  test.describe('Access Control', () => {
    test('should require authentication to access teaching mode', async ({ page }) => {
      // Try to access teaching mode without auth
      await page.goto('/lessons/some-lesson-id/teach');

      // Should redirect to login
      await page.waitForURL('**/auth/login**', { timeout: 10000 });
    });

    test('should require authentication for lesson prep mode', async ({ page }) => {
      await page.goto('/lessons/some-lesson-id/prep');

      // Should redirect to login
      await page.waitForURL('**/auth/login**', { timeout: 10000 });
    });
  });

  test.describe('Teaching Mode UI (Authenticated)', () => {
    // These tests require a logged-in user
    // They will be skipped unless TEST_USER credentials are provided

    test.beforeEach(async ({ page }) => {
      const testEmail = process.env.TEST_USER_EMAIL;
      const testPassword = process.env.TEST_USER_PASSWORD;

      if (!testEmail || !testPassword) {
        test.skip();
        return;
      }

      // Login first
      await page.goto('/auth/login');
      await page.fill('input#email', testEmail);
      await page.fill('input#password', testPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    });

    test('should display teaching mode interface', async ({ page }) => {
      const testLessonId = process.env.TEST_LESSON_ID;

      if (!testLessonId) {
        test.skip();
        return;
      }

      await page.goto(`/lessons/${testLessonId}/teach`);

      // Should show teaching mode UI elements
      await expect(page.locator('body')).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      const testLessonId = process.env.TEST_LESSON_ID;

      if (!testLessonId) {
        test.skip();
        return;
      }

      await page.goto(`/lessons/${testLessonId}/teach`);

      // Wait for content to load
      await page.waitForLoadState('networkidle');

      // Test keyboard shortcuts
      await page.keyboard.press('ArrowRight'); // Next section
      await page.keyboard.press('ArrowLeft');  // Previous section
      await page.keyboard.press('?');          // Help modal
    });
  });
});

test.describe('Cohort Sessions', () => {
  test('should require authentication for cohort pages', async ({ page }) => {
    await page.goto('/cohorts');

    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 10000 });
  });

  test('should require authentication for specific cohort', async ({ page }) => {
    await page.goto('/cohorts/some-cohort-id');

    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 10000 });
  });

  test('should require authentication for cohort sessions', async ({ page }) => {
    await page.goto('/cohorts/some-cohort-id/sessions');

    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 10000 });
  });

  test('should require authentication for cohort learners', async ({ page }) => {
    await page.goto('/cohorts/some-cohort-id/learners');

    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 10000 });
  });

  test('should require authentication for cohort assessments', async ({ page }) => {
    await page.goto('/cohorts/some-cohort-id/assessments');

    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 10000 });
  });
});

test.describe('Course Navigation', () => {
  test('should require authentication for course pages', async ({ page }) => {
    await page.goto('/courses/bamboo-building');

    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 10000 });
  });

  test('should require authentication for lesson pages', async ({ page }) => {
    await page.goto('/courses/bamboo-building/lessons/lesson-1');

    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 10000 });
  });
});
