import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The verify job runs in Playwright's container image, so the browsers and their system
// libraries come from the image, not from apt at run time (#282). The image tag must
// name the same Playwright version as the lock file, or the browsers and the test
// runner disagree.
const workflow = readFileSync(new URL("../../.github/workflows/verify.yml", import.meta.url), "utf8");
const lock = JSON.parse(readFileSync(new URL("../../package-lock.json", import.meta.url), "utf8")) as {
  packages: Record<string, { version: string }>;
};

describe("verify job's Playwright image (#282)", () => {
  const locked = lock.packages["node_modules/@playwright/test"]?.version;

  it("names the locked Playwright version in its container image", () => {
    const match = /container:\s*mcr\.microsoft\.com\/playwright:v([\d.]+)-resolute/.exec(workflow);
    expect(match?.[1], "verify.yml needs a container: line for the Playwright image").toBeDefined();
    expect(match?.[1]).toBe(locked);
  });

  it("no longer installs browsers at run time", () => {
    expect(workflow).not.toContain("playwright install");
  });
});
