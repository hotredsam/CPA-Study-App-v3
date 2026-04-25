import { defineConfig } from "@trigger.dev/sdk/v3";
import { additionalFiles, aptGet, ffmpeg } from "@trigger.dev/build/extensions/core";

// trigger.dev's jiti runner doesn't load .env; load it with the built-in Node 20+ API
if (typeof (process as NodeJS.Process & { loadEnvFile?: (p: string) => void }).loadEnvFile === "function") {
  try { (process as NodeJS.Process & { loadEnvFile: (p: string) => void }).loadEnvFile(".env"); } catch {}
}

const projectId = process.env.TRIGGER_PROJECT_ID;
if (!projectId || projectId.includes("placeholder")) {
  throw new Error("TRIGGER_PROJECT_ID is not set correctly — see .env.example");
}

type BuildExtension = ReturnType<typeof aptGet>;

function whisperCppExtension(): BuildExtension {
  return {
    name: "whisper-cpp",
    onBuildStart(context) {
      context.addLayer({
        id: "whisper-cpp",
        image: {
          pkgs: ["cmake", "build-essential", "git", "curl", "ca-certificates"],
        },
        commands: [
          "git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git /opt/whisper.cpp",
          "cmake -S /opt/whisper.cpp -B /opt/whisper.cpp/build -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON",
          "cmake --build /opt/whisper.cpp/build --config Release -j $(nproc)",
          "mkdir -p /opt/whisper.cpp/models",
          "bash /opt/whisper.cpp/models/download-ggml-model.sh small.en",
          "bash /opt/whisper.cpp/models/download-ggml-model.sh tiny.en",
        ],
        deploy: {
          env: {
            WHISPER_CPP_BIN: "/opt/whisper.cpp/build/bin/whisper-cli",
            WHISPER_MODEL_DIR: "/opt/whisper.cpp/models",
            WHISPER_MODEL_PATH: "/opt/whisper.cpp/models/ggml-small.en.bin",
            WHISPER_PREPASS_MODEL_PATH: "/opt/whisper.cpp/models/ggml-tiny.en.bin",
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
      whisperCppExtension(),
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
