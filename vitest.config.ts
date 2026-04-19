import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/integration/**/*.test.ts", "tests/db/**/*.test.ts", "tests/lib/**/*.test.ts", "tests/api/**/*.test.ts"],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
    testTimeout: 15000,
    pool: "threads",
  },
});
