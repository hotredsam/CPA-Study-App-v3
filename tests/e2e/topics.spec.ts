import { expect, test } from '@playwright/test'

test('topics page renders Topic Mastery heading', async ({ page }) => {
  await page.goto('/topics')
  await expect(page.getByRole('heading', { name: 'Topic Mastery', level: 1 })).toBeVisible()
})
