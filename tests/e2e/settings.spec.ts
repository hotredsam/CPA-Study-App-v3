import { expect, test } from '@playwright/test'

test('settings: heading visible', async ({ page }) => {
  await page.goto('/settings')
  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toBeVisible()
  await expect(heading).toContainText('Settings')
})

test('settings: tab navigation works', async ({ page }) => {
  await page.goto('/settings')
  // Default tab is Study Schedule
  await expect(page.getByRole('tab', { name: 'Study Schedule' })).toHaveAttribute('aria-selected', 'true')

  // Navigate to Models & API
  await page.getByRole('tab', { name: 'Models & API' }).click()
  await expect(page).toHaveURL(/tab=models/)
  await expect(page.getByRole('tab', { name: 'Models & API' })).toHaveAttribute('aria-selected', 'true')

  // Navigate to Appearance
  await page.getByRole('tab', { name: 'Appearance' }).click()
  await expect(page).toHaveURL(/tab=appearance/)

  // Navigate to Indexing
  await page.getByRole('tab', { name: 'Indexing' }).click()
  await expect(page).toHaveURL(/tab=indexing/)

  // Navigate to Danger Zone
  await page.getByRole('tab', { name: 'Danger Zone' }).click()
  await expect(page).toHaveURL(/tab=danger/)
})
