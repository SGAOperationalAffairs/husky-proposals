import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Port keeps agent worktrees under .claude/worktrees/. They are full checkouts
// of other branches, so linting them fails local checks on code that is not on
// this branch (#69). The paths need not exist: isPathIgnored only matches patterns.
const root = fileURLToPath(new URL("..", import.meta.url));
const eslint = new ESLint({ cwd: root });

describe("eslint ignores", () => {
  it("ignores source inside an agent worktree", async () => {
    expect(await eslint.isPathIgnored(".claude/worktrees/agent-x/src/app/page.tsx")).toBe(true);
  });

  it("ignores build output inside an agent worktree", async () => {
    expect(await eslint.isPathIgnored(".claude/worktrees/agent-x/.next/types/routes.d.ts")).toBe(true);
  });

  it("still lints real source", async () => {
    expect(await eslint.isPathIgnored("src/app/page.tsx")).toBe(false);
  });
});
