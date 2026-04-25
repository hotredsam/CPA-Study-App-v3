import { expect, test } from '@playwright/test'

test('pipeline: "Recordings" heading appears', async ({ page }) => {
  await page.goto('/pipeline')
  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toBeVisible()
  await expect(heading).toContainText('Recordings')
})
