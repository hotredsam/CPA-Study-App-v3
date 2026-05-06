import { expect, test } from '@playwright/test'

test('anki page renders Flashcards heading', async ({ page }) => {
  await page.goto('/anki')
  await expect(page.getByRole('heading', { name: 'Flashcards', level: 1 })).toBeVisible()
})

test('anki audio mode renders concept review controls', async ({ page }) => {
  await page.goto('/anki')
  await page.getByRole('tab', { name: 'Audio' }).click()
  await expect(
    page.getByRole('heading', { name: 'Concept quiz' }).or(page.getByText('Audio review is clear.')),
  ).toBeVisible()
})
