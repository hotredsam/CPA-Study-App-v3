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
  const handsFreeToggle = page.getByRole('button', { name: /Hands-free/i })
  if (await handsFreeToggle.count()) {
    await expect(handsFreeToggle).toBeVisible()
    await handsFreeToggle.click()
    await expect(handsFreeToggle).toContainText(/on/i)
  }
})

test('anki can deep link directly into audio mode for a topic drill', async ({ page }) => {
  await page.goto('/anki?topicId=e2e-topic&mode=audio')
  await expect(page.getByRole('tab', { name: 'Audio' })).toHaveAttribute('aria-selected', 'true')
})

test('anki tabs respond to keyboard shortcuts', async ({ page }) => {
  await page.goto('/anki')
  await page.keyboard.press('Alt+3')
  await expect(page.getByRole('tab', { name: 'Audio' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Alt+2')
  await expect(page.getByRole('tab', { name: 'Practice' })).toHaveAttribute('aria-selected', 'true')
})
