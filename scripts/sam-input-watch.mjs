#!/usr/bin/env node
// Long-running watcher for sam-input/audio/*.
// Run with: node scripts/sam-input-watch.mjs
// Keeps running; every new audio file triggers the dispatcher.

import chokidar from "chokidar";
import { spawnSync } from "node:child_process";

const AUDIO_DIR = "sam-input/audio";
console.log(`[sam-input-watch] watching ${AUDIO_DIR}/ for new audio files`);

const watcher = chokidar.watch(`${AUDIO_DIR}/*.{wav,m4a,mp3}`, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
});

watcher.on("add", (path) => {
  console.log(`[sam-input-watch] new audio: ${path}`);
  spawnSync("node", ["scripts/sam-input-dispatch.mjs", "audio"], { stdio: "inherit" });
});
