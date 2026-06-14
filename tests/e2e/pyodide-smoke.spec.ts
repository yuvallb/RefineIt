import { expect, test } from '@playwright/test';

test('pyodide smoke test runs DataFrame and shows preview', async ({ page }) => {
  test.setTimeout(180000);

  await page.goto('./');
  await page.getByRole('button', { name: 'Test Pyodide' }).click();

  await expect(page.getByText('3 rows × 1 columns')).toBeVisible({ timeout: 120000 });
  await expect(page.getByText('"a": 1')).toBeVisible();
});
