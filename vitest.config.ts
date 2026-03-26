import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 60_000, // AI calls can be slow
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "apps/web/src"),
      "@es-autofill/shared": resolve(__dirname, "packages/shared/src"),
    },
  },
});
