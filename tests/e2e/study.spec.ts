import { expect, test } from "@playwright/test";

type StudyTextbook = {
  id: string;
  indexStatus: string;
  chunkCount: number;
};

type StudyResponse = {
  textbooks: StudyTextbook[];
};

type StudyPracticeCard = {
  front: string;
};

type StudyChunkResponse = {
  practiceCards: StudyPracticeCard[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStudyResponse(value: unknown): value is StudyResponse {
  if (!isRecord(value) || !Array.isArray(value.textbooks)) return false;
  return value.textbooks.every((textbook) => {
    if (!isRecord(textbook)) return false;
    return (
      typeof textbook.id === "string" &&
      typeof textbook.indexStatus === "string" &&
      typeof textbook.chunkCount === "number"
    );
  });
}

function isStudyChunkResponse(value: unknown): value is StudyChunkResponse {
  if (!isRecord(value) || !Array.isArray(value.practiceCards)) return false;
  return value.practiceCards.every((card) => isRecord(card) && typeof card.front === "string");
}

test("study home: heading says Textbook Study", async ({ page }) => {
  await page.goto("/study");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toContainText("Textbook Study");
});

test("study chunk: uses indexed practice cards instead of on-demand generation", async ({ page, request }) => {
  const studyResponse = await request.get("/api/study");
  expect(studyResponse.status()).toBeLessThan(500);

  const studyJson = await studyResponse.json() as unknown;
  expect(isStudyResponse(studyJson)).toBe(true);
  if (!isStudyResponse(studyJson)) return;

  const readyTextbook = studyJson.textbooks.find(
    (textbook) => textbook.indexStatus === "READY" && textbook.chunkCount > 0,
  );
  test.skip(!readyTextbook, "No indexed textbook is available in this environment.");
  if (!readyTextbook) return;

  const chunkPath = `/study/${readyTextbook.id}/0`;
  const chunkResponse = await request.get(`/api${chunkPath}`);
  expect(chunkResponse.status()).toBe(200);

  const chunkJson = await chunkResponse.json() as unknown;
  expect(isStudyChunkResponse(chunkJson)).toBe(true);
  if (!isStudyChunkResponse(chunkJson)) return;

  await page.goto(chunkPath);

  await expect(page.getByRole("heading", { name: "Generated Practice Cards" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate Practice Questions" })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Complete checkpoint");

  if (chunkJson.practiceCards.length > 0) {
    const firstCardText = chunkJson.practiceCards[0]?.front.trim().slice(0, 80);
    expect(firstCardText?.length ?? 0).toBeGreaterThan(0);
    if (firstCardText) {
      await expect(page.getByText(firstCardText, { exact: false }).first()).toBeVisible();
    }
  } else {
    await expect(page.getByText("No generated cards found for this chunk.")).toBeVisible();
  }
});
