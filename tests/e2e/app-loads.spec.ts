import { expect, test } from '@playwright/test';

test('app loads with header and footer', async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('./');
  await expect(page).toHaveTitle(/Transform Studio/);
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Transform Studio' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toContainText('Ready');

  expect(consoleErrors).toEqual([]);
});
