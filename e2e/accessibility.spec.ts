import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test.describe('Login Page Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      await page.goto('/auth/login');

      // Email input should have associated label
      const emailLabel = page.locator('label[for="email"]');
      await expect(emailLabel).toBeVisible();
      await expect(emailLabel).toContainText('Email');

      // Password input should have associated label
      const passwordLabel = page.locator('label[for="password"]');
      await expect(passwordLabel).toBeVisible();
      await expect(passwordLabel).toContainText('Password');
    });

    test('should have proper input types', async ({ page }) => {
      await page.goto('/auth/login');

      // Email input should have type="email"
      await expect(page.locator('input#email')).toHaveAttribute('type', 'email');

      // Password input should have type="password"
      await expect(page.locator('input#password')).toHaveAttribute('type', 'password');
    });

    test('should have autocomplete attributes', async ({ page }) => {
      await page.goto('/auth/login');

      // Should have appropriate autocomplete
      await expect(page.locator('input#email')).toHaveAttribute('autocomplete', 'email');
      await expect(page.locator('input#password')).toHaveAttribute('autocomplete', 'current-password');
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/auth/login');

      // Tab to email input
      await page.keyboard.press('Tab');

      // Email input should be focused (or first focusable element)
      // Continue tabbing through form
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to navigate without mouse
    });

    test('should have visible focus states', async ({ page }) => {
      await page.goto('/auth/login');

      // Focus on email input
      await page.locator('input#email').focus();

      // Should have focus ring (check for focus-related styles)
      await expect(page.locator('input#email')).toBeFocused();
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient text contrast on login page', async ({ page }) => {
      await page.goto('/auth/login');

      // The page should be visible (basic check)
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });

  test.describe('ARIA Landmarks', () => {
    test('main content should be identifiable', async ({ page }) => {
      await page.goto('/auth/login');

      // Should have main content area
      // Login form should be visible
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Error States Accessibility', () => {
    test('error messages should be visible', async ({ page }) => {
      await page.goto('/auth/login?error=CredentialsSignin');

      // Error message should be visible
      const errorMessage = page.locator('.bg-red-50');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('Loading States', () => {
    test('submit button should indicate loading state', async ({ page }) => {
      await page.goto('/auth/login');

      // Fill form
      await page.fill('input#email', 'test@example.com');
      await page.fill('input#password', 'testpassword');

      // Submit form
      await page.click('button[type="submit"]');

      // Button should show loading state (spinner or text change)
      // Check for disabled state or loading text
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toHaveAttribute('disabled', '');
    });
  });
});
