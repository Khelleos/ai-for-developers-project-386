/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "**/*.config.*",
        "**/main.tsx",
        "vitest.setup.ts",
        "src/api/schema.ts",
        "**/*.test.{ts,tsx}",
        "dist/**",
      ],
    },
  },
});
