import { expect, test, type Page } from "@playwright/test";

type RouteInfo = {
  path: string;
  name: string;
};

type Check = {
  title: string;
  run: (page: Page) => Promise<void>;
};

const routes: RouteInfo[] = [
  { path: "/", name: "dashboard" },
  { path: "/record", name: "record" },
  { path: "/pipeline", name: "pipeline" },
  { path: "/review", name: "review" },
  { path: "/topics", name: "topics" },
  { path: "/study", name: "study" },
  { path: "/anki", name: "anki" },
  { path: "/library", name: "library" },
  { path: "/settings", name: "settings" },
  { path: "/sessions", name: "sessions" },
  { path: "/analytics", name: "analytics" },
];

const navLabels = [
  "Dashboard",
  "Record",
  "Pipeline",
  "Review",
  "Topics",
  "Study Textbook",
  "Anki",
  "Library",
  "Settings",
];

async function open(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response, `${path} should return a document response`).not.toBeNull();
  expect(response?.status(), `${path} should not return a server error`).toBeLessThan(500);
  await expect(page.locator("body")).toBeVisible();
}

async function visibleText(page: Page) {
  return page.locator("body").innerText();
}

async function unnamedVisibleButtons(page: Page) {
  return page.locator("button").evaluateAll((buttons) => {
    return buttons.filter((button) => {
      const rect = button.getBoundingClientRect();
      const style = window.getComputedStyle(button);
      const visible = rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
      const name = `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`.trim();
      return visible && name.length === 0;
    }).length;
  });
}

async function unnamedVisibleLinks(page: Page) {
  return page.locator("a[href]").evaluateAll((links) => {
    return links.filter((link) => {
      const rect = link.getBoundingClientRect();
      const style = window.getComputedStyle(link);
      const visible = rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
      const name = `${link.getAttribute("aria-label") ?? ""} ${link.textContent ?? ""}`.trim();
      return visible && name.length === 0;
    }).length;
  });
}

async function unnamedVisibleControls(page: Page) {
  return page.locator("input, select, textarea").evaluateAll((controls) => {
    return controls.filter((control) => {
      if (control instanceof HTMLInputElement && control.type === "hidden") return false;

      const rect = control.getBoundingClientRect();
      const style = window.getComputedStyle(control);
      if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden") return false;

      const labelledBy = control.getAttribute("aria-labelledby");
      const labelledByText = labelledBy
        ? labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent ?? "")
            .join(" ")
            .trim()
        : "";
      const directName = [
        control.getAttribute("aria-label"),
        control.getAttribute("title"),
        control.getAttribute("placeholder"),
        labelledByText,
      ]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(" ")
        .trim();

      const labelText = control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement
        ? Array.from(control.labels ?? []).map((label) => label.textContent ?? "").join(" ").trim()
        : "";

      return directName.length === 0 && labelText.length === 0;
    }).length;
  });
}

async function outOfRangeProgressbars(page: Page) {
  return page.locator('[role="progressbar"]').evaluateAll((bars) => {
    return bars.filter((bar) => {
      const now = Number(bar.getAttribute("aria-valuenow"));
      const min = Number(bar.getAttribute("aria-valuemin") ?? 0);
      const max = Number(bar.getAttribute("aria-valuemax") ?? 100);
      return !Number.isFinite(now) || !Number.isFinite(min) || !Number.isFinite(max) || now < min || now > max;
    }).length;
  });
}

const genericChecks: Check[] = routes.flatMap((route) => [
  {
    title: `${route.name}: loads without a server error`,
    run: async (page) => {
      await open(page, route.path);
    },
  },
  {
    title: `${route.name}: has a visible page heading`,
    run: async (page) => {
      await open(page, route.path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    },
  },
  {
    title: `${route.name}: renders useful body copy`,
    run: async (page) => {
      await open(page, route.path);
      expect((await visibleText(page)).trim().length).toBeGreaterThan(20);
    },
  },
  {
    title: `${route.name}: does not show framework crash text`,
    run: async (page) => {
      await open(page, route.path);
      await expect(page.locator("body")).not.toContainText(
        /Runtime Error|Unhandled Runtime Error|Cannot find module|Application error|Internal Server Error|This page could not be found/i,
      );
    },
  },
  {
    title: `${route.name}: avoids broken placeholder tokens`,
    run: async (page) => {
      await open(page, route.path);
      expect(await visibleText(page)).not.toMatch(/\bNaN\b|Infinity|\[object Object\]|\bundefined\b/);
    },
  },
  {
    title: `${route.name}: exposes the main navigation landmark`,
    run: async (page) => {
      await open(page, route.path);
      await expect(page.getByRole("navigation", { name: /main navigation/i })).toBeVisible();
    },
  },
  {
    title: `${route.name}: keeps all primary nav destinations discoverable`,
    run: async (page) => {
      await open(page, route.path);
      const nav = page.getByRole("navigation", { name: /main navigation/i });
      for (const label of navLabels) {
        await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
      }
    },
  },
  {
    title: `${route.name}: every visible button has an accessible name`,
    run: async (page) => {
      await open(page, route.path);
      expect(await unnamedVisibleButtons(page)).toBe(0);
    },
  },
  {
    title: `${route.name}: every visible link has an accessible name`,
    run: async (page) => {
      await open(page, route.path);
      expect(await unnamedVisibleLinks(page)).toBe(0);
    },
  },
  {
    title: `${route.name}: every visible form control is named`,
    run: async (page) => {
      await open(page, route.path);
      expect(await unnamedVisibleControls(page)).toBe(0);
    },
  },
  {
    title: `${route.name}: progress indicators stay within 0 to 100 percent`,
    run: async (page) => {
      await open(page, route.path);
      expect(await outOfRangeProgressbars(page)).toBe(0);
    },
  },
  {
    title: `${route.name}: keyboard tabbing reaches an interactive target`,
    run: async (page) => {
      await open(page, route.path);
      await page.keyboard.press("Tab");
      const activeTag = await page.evaluate(() => document.activeElement?.tagName ?? "");
      expect(activeTag).not.toBe("BODY");
    },
  },
  {
    title: `${route.name}: document title is meaningful`,
    run: async (page) => {
      await open(page, route.path);
      expect((await page.title()).trim().length).toBeGreaterThan(3);
    },
  },
  {
    title: `${route.name}: no unhandled page errors during initial render`,
    run: async (page) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await open(page, route.path);
      expect(pageErrors).toEqual([]);
    },
  },
  {
    title: `${route.name}: images are either decorative or named`,
    run: async (page) => {
      await open(page, route.path);
      const missingAlt = await page.locator("img").evaluateAll((images) => {
        return images.filter((image) => {
          const decorative = image.getAttribute("aria-hidden") === "true" || image.getAttribute("role") === "presentation";
          return !decorative && image.getAttribute("alt") === null;
        }).length;
      });
      expect(missingAlt).toBe(0);
    },
  },
  {
    title: `${route.name}: main content landmark is visible`,
    run: async (page) => {
      await open(page, route.path);
      await expect(page.locator("main").first()).toBeVisible();
    },
  },
  {
    title: `${route.name}: live pipeline status remains visible in the shell`,
    run: async (page) => {
      await open(page, route.path);
      await expect(page.getByRole("navigation", { name: /main navigation/i }).getByText(/recordings processing/i)).toBeVisible();
    },
  },
]);

const specificChecks: Check[] = [
  {
    title: "study goal: dashboard exposes a current focus",
    run: async (page) => {
      await open(page, "/");
      await expect(page.getByText(/current focus/i)).toBeVisible();
    },
  },
  {
    title: "study goal: dashboard offers a fast recording action",
    run: async (page) => {
      await open(page, "/");
      await expect(page.getByRole("button", { name: /record session/i })).toBeVisible();
    },
  },
  {
    title: "study goal: dashboard offers a reading continuation action",
    run: async (page) => {
      await open(page, "/");
      await expect(page.getByRole("button", { name: /continue reading/i })).toBeVisible();
    },
  },
  {
    title: "recording: preflight shows screen capture setup",
    run: async (page) => {
      await open(page, "/record");
      await expect(page.getByText("Screen Capture")).toBeVisible();
    },
  },
  {
    title: "recording: section selection is explicit",
    run: async (page) => {
      await open(page, "/record");
      await expect(page.getByRole("group", { name: /select cpa sections/i })).toBeVisible();
    },
  },
  {
    title: "recording: start is guarded until a section is selected",
    run: async (page) => {
      await open(page, "/record");
      await expect(page.getByRole("button", { name: /start recording/i })).toBeDisabled();
    },
  },
  {
    title: "library: upload action is available",
    run: async (page) => {
      await open(page, "/library");
      await expect(page.getByRole("button", { name: /upload textbook/i }).first()).toBeVisible();
    },
  },
  {
    title: "library: empty or populated textbook state is understandable",
    run: async (page) => {
      await open(page, "/library");
      await expect(page.locator("body")).toContainText(/No textbooks yet|BOOK/);
    },
  },
  {
    title: "anki: spaced repetition modes are available",
    run: async (page) => {
      await open(page, "/anki");
      for (const name of ["Daily", "Practice", "Path", "Browse"]) {
        await expect(page.getByRole("tab", { name })).toBeVisible();
      }
    },
  },
  {
    title: "anki: browse mode supports finding generated flashcards",
    run: async (page) => {
      await open(page, "/anki");
      const browseTab = page.getByRole("tab", { name: "Browse" });
      await browseTab.click();
      await expect(browseTab).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("textbox", { name: /search flashcards/i })).toBeVisible();
    },
  },
  {
    title: "settings: appearance tab is reachable",
    run: async (page) => {
      await open(page, "/settings");
      const appearanceTab = page.getByRole("tab", { name: "Appearance" });
      await appearanceTab.click();
      await expect(appearanceTab).toHaveAttribute("aria-selected", "true");
      await expect(page).toHaveURL(/tab=appearance/);
    },
  },
  {
    title: "study: textbook study home gives a next step",
    run: async (page) => {
      await open(page, "/study");
      await expect(page.locator("body")).toContainText(/Textbooks|Upload textbooks|No textbooks|Continue/);
    },
  },
  {
    title: "pipeline: processing and previous work are separated",
    run: async (page) => {
      await open(page, "/pipeline");
      await expect(page.getByRole("tab", { name: /processing/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /previous/i })).toBeVisible();
    },
  },
];

const checks: Check[] = [...genericChecks, ...specificChecks];

if (checks.length !== 200) {
  throw new Error(`Expected exactly 200 professional UX checks, found ${checks.length}.`);
}

test.describe("professional UX and study effectiveness", () => {
  for (const [index, check] of checks.entries()) {
    test(`${String(index + 1).padStart(3, "0")} ${check.title}`, async ({ page }) => {
      await check.run(page);
    });
  }
});
