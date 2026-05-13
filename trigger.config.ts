import { defineConfig } from "@trigger.dev/sdk/v3";
import { additionalFiles, aptGet, ffmpeg, syncEnvVars } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { existsSync, readFileSync } from "node:fs";

// trigger.dev's runner doesn't always load .env. Keep explicitly supplied
// env-file values (production deploy) higher priority than local .env values.
function loadEnvFileWithoutOverwriting(path: string): void {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (process.env[key] !== undefined) continue;
    const rawValue = line.slice(separator + 1).trim();
    const value =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;
    process.env[key] = value;
  }
}

loadEnvFileWithoutOverwriting(".env");

const DEFAULT_TRIGGER_PROJECT_ID = "proj_mxpqtppxepozihydhhsm";
const projectId = process.env.TRIGGER_PROJECT_ID ?? DEFAULT_TRIGGER_PROJECT_ID;
if (!projectId || projectId.includes("placeholder")) {
  throw new Error("TRIGGER_PROJECT_ID is not set correctly — see .env.example");
}

type BuildExtension = ReturnType<typeof aptGet>;

const RUNTIME_ENV_NAMES = [
  "DATABASE_URL",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
  "TRIGGER_PROJECT_ID",
  "TRIGGER_SECRET_KEY",
  "OPENROUTER_API_KEY",
  "OPENROUTER_PDF_ENGINE",
  "OPENROUTER_PDF_MODEL",
  "OPENROUTER_TEXTBOOK_HTML_MODEL",
  "OPENROUTER_TEXTBOOK_HTML_MAX_TOKENS",
  "SPEND_GATES_ENABLED",
  "OPENROUTER_MAX_COST_PER_CALL_USD",
  "OPENROUTER_INDEXING_MAX_COST_PER_CALL_USD",
  "OPENROUTER_DAILY_CAP_USD",
  "OPENROUTER_RECORDING_CAP_USD",
  "OPENROUTER_QUESTION_CAP_USD",
  "ENCRYPTION_KEY",
] as const;

function runtimeDeployEnv(): Record<string, string> {
  return RUNTIME_ENV_NAMES.reduce<Record<string, string>>((env, name) => {
    const value = process.env[name];
    if (value) env[name] = value;
    return env;
  }, {});
}

function whisperCppExtension(): BuildExtension {
  const whisperRoot = "/home/node/.cache/whisper.cpp";

  return {
    name: "whisper-cpp",
    onBuildStart(context) {
      context.addLayer({
        id: "whisper-cpp",
        image: {
          pkgs: ["cmake", "build-essential", "git", "curl", "ca-certificates"],
        },
        commands: [
          `mkdir -p ${whisperRoot}`,
          `git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git ${whisperRoot}`,
          `cmake -S ${whisperRoot} -B ${whisperRoot}/build -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON`,
          `cmake --build ${whisperRoot}/build --config Release -j $(nproc)`,
          `mkdir -p ${whisperRoot}/models`,
          `bash ${whisperRoot}/models/download-ggml-model.sh small.en`,
          `bash ${whisperRoot}/models/download-ggml-model.sh tiny.en`,
        ],
        build: {
          env: {
            TRIGGER_PROJECT_ID: projectId,
          },
        },
        deploy: {
          env: {
            ...runtimeDeployEnv(),
            WHISPER_CPP_BIN: `${whisperRoot}/build/bin/whisper-cli`,
            WHISPER_MODEL_DIR: `${whisperRoot}/models`,
            WHISPER_MODEL_PATH: `${whisperRoot}/models/ggml-small.en.bin`,
            WHISPER_PREPASS_MODEL_PATH: `${whisperRoot}/models/ggml-tiny.en.bin`,
          },
        },
      });
    },
  };
}

export default defineConfig({
  project: projectId,
  runtime: "node",
  logLevel: "info",
  maxDuration: 900,
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      ffmpeg(),
      aptGet({ packages: ["cmake", "build-essential", "git", "curl", "ca-certificates"] }),
      syncEnvVars(() => runtimeDeployEnv(), { override: true }),
      whisperCppExtension(),
      prismaExtension({ mode: "legacy", schema: "prisma/schema.prisma" }),
      additionalFiles({ files: ["./fixtures/*.json", "./fixtures/README.md"] }),
    ],
  },
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 30_000,
      randomize: true,
    },
  },
});
