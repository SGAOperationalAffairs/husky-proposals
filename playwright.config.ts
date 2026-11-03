import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// `verify` runs Chromium and WebKit (iPhone Safari). `verify:all` adds Firefox.
const withFirefox = process.env.PLAYWRIGHT_FIREFOX === "1";

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // Read a failure before rerunning (CLAUDE.md). No automatic retries.
  // In CI, every run writes an HTML report, and every test keeps a trace, so a failure
  // can be read from the saved artifacts instead of guessed at (#143). Local runs are unchanged.
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: process.env.CI ? "on" : "off",
    screenshot: process.env.CI ? "only-on-failure" : "off",
  },
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
    env: { APP_ENV: "test" },
  },
});
