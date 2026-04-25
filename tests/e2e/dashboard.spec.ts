import { expect, test } from '@playwright/test'

test('dashboard: h1 renders progress headline', async ({ page }) => {
  await page.goto('/')
  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toBeVisible()
  await expect(heading).toContainText(/\d+(\.\d+)? hours in, \d+(\.\d+)? this week, on pace\./)
})
