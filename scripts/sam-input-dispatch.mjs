#!/usr/bin/env node
// Dispatcher for sam-input. Invoked by .claude/settings.json PostToolUse hook
// and by the chokidar watcher (scripts/sam-input-watch.mjs).
//
// Usage: node scripts/sam-input-dispatch.mjs <mode>
//   mode = "xml"   — diff TODO.xml vs last.xml, spawn claude for new <item>s
//   mode = "audio" — transcribe any *.wav|*.m4a|*.mp3 in sam-input/audio,
//                    append to TODO.xml, then re-run in "xml" mode.
//
// Auth: relies on the ambient CLAUDE_CODE_OAUTH_TOKEN env var. No API keys.

import { execSync, spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
} from "node:fs";
import { join } from "node:path";

const REPO = process.cwd();
const XML = join(REPO, "sam-input", "TODO.xml");
const PROCESSED_DIR = join(REPO, "sam-input", ".processed");
const LAST_XML = join(PROCESSED_DIR, "last.xml");
const AUDIO_DIR = join(REPO, "sam-input", "audio");
const AUDIO_ARCHIVE = join(PROCESSED_DIR, "audio-archive");

if (!existsSync(PROCESSED_DIR)) mkdirSync(PROCESSED_DIR, { recursive: true });
if (!existsSync(AUDIO_ARCHIVE)) mkdirSync(AUDIO_ARCHIVE, { recursive: true });

const mode = process.argv[2] ?? "xml";

if (mode === "audio") {
  if (!existsSync(AUDIO_DIR)) {
    // Nothing to do
    process.exit(0);
  }
  for (const file of readdirSync(AUDIO_DIR).filter((f) => /\.(wav|m4a|mp3)$/i.test(f))) {
    const src = join(AUDIO_DIR, file);
    let out = "";
    try {
      // Local whisper.cpp transcription via smart-whisper CLI shim
      out = execSync(
        `npx -y smart-whisper transcribe --model small.en --input "${src}" --format text`,
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ).trim();
    } catch (err) {
      console.error(`[sam-input-dispatch] whisper failed for ${file}:`, err?.message ?? err);
      continue;
    }
    if (!out) {
      console.error(`[sam-input-dispatch] no speech detected in ${file}, archiving`);
      renameSync(src, join(AUDIO_ARCHIVE, file));
      continue;
    }
    const xml = readFileSync(XML, "utf8");
    const id = `${new Date().toISOString().slice(0, 10)}-audio-${Date.now()}`;
    const item =
      `\n    <item id="${id}" priority="normal" kind="feature" source="audio:${file}">\n` +
      `      <body>${escapeXml(out)}</body>\n    </item>`;
    const updated = xml.replace(/(<items>)/, `$1${item}`);
    writeFileSync(XML, updated);
    renameSync(src, join(AUDIO_ARCHIVE, file));
  }
  // Fall through to xml dispatch
}

// Diff mode: compare current XML vs last-processed snapshot
const current = readFileSync(XML, "utf8");
const last = existsSync(LAST_XML) ? readFileSync(LAST_XML, "utf8") : "";
if (current === last) {
  process.exit(0);
}

const newItems = extractItems(current).filter((it) => !last.includes(`id="${it.id}"`));
if (newItems.length === 0) {
  writeFileSync(LAST_XML, current);
  process.exit(0);
}

for (const it of newItems) {
  const prompt =
    `Work on this item from Sam, then move it into <done> in sam-input/TODO.xml when complete:\n\n` +
    `ID: ${it.id}\nKind: ${it.kind}\nPriority: ${it.priority}\nBody:\n${it.body}\n\n` +
    `Respect CLAUDE.md conventions. Commit and push when done.`;
  const res = spawnSync(
    "claude",
    ["-p", prompt, "--permission-mode", "acceptEdits"],
    { stdio: "inherit", env: process.env },
  );
  if (res.status !== 0) {
    console.error(`[sam-input-dispatch] claude exited with ${res.status} for item ${it.id}`);
  }
}

writeFileSync(LAST_XML, current);

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function extractItems(xml) {
  const items = [];
  const re =
    /<item\s+id="([^"]+)"\s+priority="([^"]+)"\s+kind="([^"]+)"[^>]*>\s*<body>([\s\S]*?)<\/body>\s*<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    items.push({ id: m[1], priority: m[2], kind: m[3], body: m[4].trim() });
  }
  return items;
}
