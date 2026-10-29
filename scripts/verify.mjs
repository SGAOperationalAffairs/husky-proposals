// One command for every check (#26). CI runs the same command.
//
//   npm run verify         everything: format, lint, types, styles, unit and
//                          component tests, build, browser tests (Chromium, WebKit)
//   npm run verify:agent   what port's agent worktrees can run with no secrets:
//                          format, lint, types, styles, schema, unit and component tests
//   npm run verify:all     verify, plus Firefox
//
// Prints one line per suite. Runs every suite even after a failure, then shows
// the output of each failed one, so a single run tells you everything.
import { spawnSync } from "node:child_process";

const tier = process.argv[2] ?? "full";

const fast = [
  ["format", "npx", ["prettier", "--check", "."]],
  ["lint", "npx", ["eslint", "--max-warnings=0"]],
  ["types", "npm", ["run", "--silent", "typecheck"]],
  ["styles", "node", ["scripts/check-styles.mjs"]],
  ["schema", "npx", ["prisma", "validate"]],
  ["unit and component tests", "npx", ["vitest", "run"]],
];
const slow = [
  ["build", "npx", ["next", "build"]],
  ["browser tests", "npx", ["playwright", "test"]],
];
// Database tests join here once the Neon test branch exists (T0.4).

const steps = tier === "agent" ? fast : [...fast, ...slow];
const env = { ...process.env, VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" };
if (tier === "all") env.PLAYWRIGHT_FIREFOX = "1";

const failures = [];
for (const [name, cmd, args] of steps) {
  const start = Date.now();
  const run = spawnSync(cmd, args, { encoding: "utf8", env, shell: process.platform === "win32" });
  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  const ok = run.status === 0;
  console.log(`${ok ? "pass" : "FAIL"}  ${name} (${seconds}s)`);
  if (!ok) failures.push([name, `${run.stdout ?? ""}${run.stderr ?? ""}`]);
}

for (const [name, output] of failures) {
  console.log(`\n---- ${name} ----\n${output.trim().split("\n").slice(-40).join("\n")}`);
}
console.log(failures.length === 0 ? "\nverify: all passed" : `\nverify: ${failures.length} failed`);
process.exit(failures.length === 0 ? 0 : 1);
