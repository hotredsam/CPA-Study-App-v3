import { expect, test } from '@playwright/test'

test('topics page renders prototype heading', async ({ page }) => {
  await page.goto('/topics')
  await expect(page.getByRole('heading', { name: 'Topics extracted by Claude from your textbooks', level: 1 })).toBeVisible()
})
