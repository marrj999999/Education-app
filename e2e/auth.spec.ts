import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/auth/login');

      // Check page elements
      await expect(page.locator('h1')).toContainText('Welcome back');
      await expect(page.locator('input#email')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
    });

    test('should show validation for empty fields', async ({ page }) => {
      await page.goto('/auth/login');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Browser should prevent submission due to required fields
      const emailInput = page.locator('input#email');
      await expect(emailInput).toHaveAttribute('required', '');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      // Fill in invalid credentials
      await page.fill('input#email', 'invalid@example.com');
      await page.fill('input#password', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Wait for error message
      const errorMessage = page.locator('.bg-red-50');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    });

    test('should have link to registration page', async ({ page }) => {
      await page.goto('/auth/login');

      const registerLink = page.locator('a[href="/auth/register"]');
      await expect(registerLink).toBeVisible();
      await expect(registerLink).toContainText('Create one');
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto('/auth/login');

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      const forgotLink = page.locator('a[href="/auth/reset-password"]');
      await expect(forgotLink).toBeVisible({ timeout: 10000 });
      await expect(forgotLink).toContainText('Forgot password');
    });

    test('should redirect to dashboard after successful login', async ({ page }) => {
      // This test requires a valid test user in the database
      // Skip if no test credentials are configured
      const testEmail = process.env.TEST_USER_EMAIL;
      const testPassword = process.env.TEST_USER_PASSWORD;

      if (!testEmail || !testPassword) {
        test.skip();
        return;
      }

      await page.goto('/auth/login');

      await page.fill('input#email', testEmail);
      await page.fill('input#password', testPassword);
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Registration Page', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/auth/register');

      await expect(page.locator('input#name')).toBeVisible();
      await expect(page.locator('input#email')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto('/auth/register');

      const loginLink = page.locator('a[href="/auth/login"]');
      await expect(loginLink).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
      await page.goto('/dashboard');

      // Should redirect to login page
      await page.waitForURL('**/auth/login**', { timeout: 10000 });
    });

    test('should redirect to login when accessing cohorts without auth', async ({ page }) => {
      await page.goto('/cohorts');

      // Should redirect to login page
      await page.waitForURL('**/auth/login**', { timeout: 10000 });
    });

    test('should redirect to login when accessing admin without auth', async ({ page }) => {
      await page.goto('/admin');

      // Should redirect to login page
      await page.waitForURL('**/auth/login**', { timeout: 10000 });
    });
  });
});
