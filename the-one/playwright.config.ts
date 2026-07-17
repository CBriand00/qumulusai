import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for public flows. Auth-gated flows require a live Supabase/GoTrue
 * backend; these specs cover everything reachable without one. The dev server
 * points at an unreachable Supabase URL so server components fall back cleanly
 * (see getSiteOverrides) and unauthenticated redirects still work.
 */
const PORT = 3100;
const BROWSER = "/opt/pw-browsers/chromium"; // preinstalled; no download needed

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: BROWSER, args: ["--no-sandbox"] },
      },
    },
  ],
  webServer: {
    // Production build for deterministic behavior (no on-demand dev compiles).
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${PORT}`,
      // Unreachable on purpose: server components fall back to static config.
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
