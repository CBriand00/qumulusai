import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Local Vitest config. `root` is pinned to this directory so Vitest does not
 * walk up into the sibling project's Vite config.
 */
export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
