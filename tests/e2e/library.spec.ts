import { expect, test } from '@playwright/test'

test('library page renders Textbooks heading', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (text.includes('Failed to load resource')) return
      errors.push(text)
    }
  })
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/library')

  await expect(page.getByRole('heading', { level: 1, name: 'Textbooks' })).toBeVisible()
  expect(errors).toEqual([])
})
