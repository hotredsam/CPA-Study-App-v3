import { expect, test } from '@playwright/test'

test('dashboard: h1 contains CPA Study Servant', async ({ page }) => {
  await page.goto('/')
  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toBeVisible()
  await expect(heading).toContainText('CPA Study Servant')
})
