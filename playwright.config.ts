import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// `verify` runs Chromium and WebKit (iPhone Safari). `verify:all` adds Firefox.
const withFirefox = process.env.PLAYWRIGHT_FIREFOX === "1";

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // Read a failure before rerunning (CLAUDE.md). No automatic retries.
  reporter: process.env.CI ? "github" : "line",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit-iphone", use: { ...devices["iPhone 15"] } },
    ...(withFirefox ? [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }] : []),
  ],
  // Tests run against the production build, so `verify` builds first.
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
