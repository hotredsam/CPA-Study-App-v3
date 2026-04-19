import { expect, test } from '@playwright/test'

test('anki page renders Flashcards heading', async ({ page }) => {
  await page.goto('/anki')
  await expect(page.getByRole('heading', { name: 'Flashcards', level: 1 })).toBeVisible()
})
