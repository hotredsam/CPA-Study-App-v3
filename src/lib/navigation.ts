export type ShellBadgeType = "pipeline" | "anki";

export type ShellNavDestination = {
  id: string;
  label: string;
  paletteLabel: string;
  key: string;
  route: string;
  badgeType?: ShellBadgeType;
  searchTerms: string[];
};

export const SHELL_NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    paletteLabel: "Dashboard",
    key: "h",
    route: "/",
    searchTerms: ["home", "overview", "progress"],
  },
  {
    id: "record",
    label: "Record",
    paletteLabel: "Record",
    key: "r",
    route: "/record",
    searchTerms: ["capture", "screen", "session", "upload"],
  },
  {
    id: "pipeline",
    label: "Pipeline",
    paletteLabel: "Pipeline",
    key: "s",
    route: "/pipeline",
    badgeType: "pipeline",
    searchTerms: ["status", "processing", "recordings"],
  },
  {
    id: "review",
    label: "Review",
    paletteLabel: "Review",
    key: "v",
    route: "/review",
    searchTerms: ["questions", "feedback", "sessions"],
  },
  {
    id: "topics",
    label: "Topics",
    paletteLabel: "Topics",
    key: "y",
    route: "/topics",
    searchTerms: ["mastery", "units", "coverage"],
  },
  {
    id: "study",
    label: "Study Textbook",
    paletteLabel: "Study Textbook",
    key: "u",
    route: "/study",
    searchTerms: ["textbook", "reading", "chunks"],
  },
  {
    id: "anki",
    label: "Anki",
    paletteLabel: "Anki",
    key: "a",
    route: "/anki",
    badgeType: "anki",
    searchTerms: ["flashcards", "cards", "practice", "audio"],
  },
  {
    id: "library",
    label: "Library",
    paletteLabel: "Library",
    key: "l",
    route: "/library",
    searchTerms: ["textbooks", "uploads", "books"],
  },
  {
    id: "settings",
    label: "Settings",
    paletteLabel: "Settings",
    key: "t",
    route: "/settings",
    searchTerms: ["config", "models", "appearance"],
  },
] as const satisfies readonly ShellNavDestination[];

export type ShellNavItem = (typeof SHELL_NAV_ITEMS)[number];

export const SHELL_NAV_BY_KEY = SHELL_NAV_ITEMS.reduce<Record<string, ShellNavItem>>(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {},
);

export function searchShellNav(query: string): ShellNavItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...SHELL_NAV_ITEMS];
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return SHELL_NAV_ITEMS.filter((item) => {
    const haystack = [
      item.label,
      item.paletteLabel,
      item.key,
      item.route,
      ...item.searchTerms,
    ].join(" ").toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}
