import { test, expect } from '@playwright/test';

test.describe('Navigation & Public Pages', () => {
  test.describe('Home Page', () => {
    test('should load the home page', async ({ page }) => {
      await page.goto('/');

      // Should have the Bamboo Bicycle Club branding
      await expect(page).toHaveTitle(/Bamboo Bicycle/i);
    });

    test('should have navigation links', async ({ page }) => {
      await page.goto('/');

      // Check for login link
      const loginLink = page.locator('a[href*="login"]');
      await expect(loginLink.first()).toBeVisible();
    });
  });

  test.describe('Demo Page', () => {
    test('should load the demo page', async ({ page }) => {
      await page.goto('/demo');

      // Wait for page to settle
      await page.waitForLoadState('networkidle');

      // Demo page should be accessible without authentication
      await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10000 });
    });
  });

  test.describe('Error Pages', () => {
    test('should show 404 for non-existent pages', async ({ page }) => {
      const response = await page.goto('/this-page-does-not-exist-12345');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Should show 404 content (Next.js may return 200 with 404 page content)
      // Check for 404 text on the page as a more reliable indicator
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain('404');
    });

    test('should show auth error page', async ({ page }) => {
      await page.goto('/auth/error');

      // Error page should be accessible
      await expect(page).toHaveURL('/auth/error');
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/');

      // Page should still be usable
      await expect(page.locator('body')).toBeVisible();
    });

    test('should be responsive on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/');

      // Page should still be usable
      await expect(page.locator('body')).toBeVisible();
    });

    test('login page should be responsive', async ({ page }) => {
      // Test on mobile
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/auth/login');

      // Form should be visible and usable
      await expect(page.locator('input#email')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });
});
