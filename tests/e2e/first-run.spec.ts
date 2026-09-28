import { test, expect } from '@playwright/test';

test('starts through the QuickBite Core API flow', async ({ page }) => {
  await page.goto('/');

  await expect(page).not.toHaveTitle(/configuraci[oó]n inicial/i);
  await expect(page.getByText(/QuickBite/i).first()).toBeVisible();
});
