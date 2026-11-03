// Dependency check (#119): report high or critical advisories and major-version gaps.
// Nothing else checks for these. It needs the network, so it runs weekly in
// .github/workflows/dependencies.yml and by hand, never in `npm run verify`.
//
// Exit codes: 0 no high or critical advisory; 1 at least one; 2 npm output could not be read.
// The outdated report is information and never fails the run.
//
// Usage: npm run deps:check
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { z } from "zod";

const SEVERITIES = ["info", "low", "moderate", "high", "critical"];

// Loose on purpose: npm's JSON shape is not a documented contract, so extra fields
// never fail the parse and a changed shape exits 2 instead of passing silently.
const viaSchema = z.union([
  z.string(),
  z.object({ title: z.string(), url: z.string(), severity: z.enum(SEVERITIES) }).loose(),
]);

const auditSchema = z
  .object({
    vulnerabilities: z.record(
      z.string(),
      z
        .object({
          name: z.string(),
          severity: z.enum(SEVERITIES),
          isDirect: z.boolean(),
          via: z.array(viaSchema),
          fixAvailable: z.union([z.boolean(), z.object({}).loose()]),
        })
        .loose(),
    ),
    metadata: z
      .object({
        vulnerabilities: z.object({
          info: z.number(),
          low: z.number(),
          moderate: z.number(),
          high: z.number(),
          critical: z.number(),
          total: z.number(),
        }),
      })
      .loose(),
  })
  .loose();

const outdatedSchema = z.record(
  z.string(),
  z
    .object({
      current: z.string().optional(),
      wanted: z.string(),
      latest: z.string(),
      type: z.string().optional(),
    })
    .loose(),
);

function parseJson(text, schema) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: { code: "not_json" } };
  }
  const parsed = schema.safeParse(json);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, error: { code: "unexpected_shape" } };
}

export function parseAudit(text) {
  return parseJson(text, auditSchema);
}

// Empty stdout is what `npm outdated --json` prints when nothing is outdated.
export function parseOutdated(text) {
  if (text.trim() === "") return { ok: true, value: {} };
  return parseJson(text, outdatedSchema);
}

export function blockingAdvisories(report) {
  const rank = { critical: 0, high: 1 };
  return Object.values(report.vulnerabilities)
    .filter((v) => v.severity === "high" || v.severity === "critical")
    .map((v) => ({
      name: v.name,
      severity: v.severity,
      isDirect: v.isDirect,
      fixAvailable: v.fixAvailable !== false,
      advisories: v.via.filter((via) => typeof via !== "string").map(({ title, url }) => ({ title, url })),
      throughs: v.via.filter((via) => typeof via === "string"),
    }))
    .sort((a, b) => rank[a.severity] - rank[b.severity] || a.name.localeCompare(b.name));
}

// A local split, not the `semver` package: only major, minor, and "is a prerelease" matter.
function splitVersion(version) {
  const [core = "", ...pre] = version.split("-");
  const [major = "0", minor = "0"] = core.split(".");
  return { major: Number(major), minor: Number(minor), prerelease: pre.length > 0 };
}

// For 0.x, a higher minor is a breaking change under caret ranges, so it counts as a major gap.
function isMajorGap(from, to) {
  if (to.major !== from.major) return to.major > from.major;
  return from.major === 0 && to.minor > from.minor;
}

export function majorGaps(outdated) {
  const gaps = [];
  const prereleases = [];
  for (const [name, row] of Object.entries(outdated).sort(([a], [b]) => a.localeCompare(b))) {
    const current = row.current ?? row.wanted;
    const latest = splitVersion(row.latest);
    if (latest.prerelease) {
      prereleases.push({ name, current, latest: row.latest });
    } else if (isMajorGap(splitVersion(current), latest)) {
      gaps.push({ name, current, latest: row.latest, type: row.type });
    }
  }
  return { gaps, prereleases };
}

// Markdown that also reads fine in a terminal, so one string serves both.
export function formatReport({ blocking, counts, gaps, prereleases }) {
  const lines = ["## Advisories", ""];
  lines.push(
    `Totals: ${counts.critical} critical, ${counts.high} high, ${counts.moderate} moderate, ${counts.low} low, ${counts.info} info.`,
  );
  if (blocking.length === 0) {
    lines.push(`No high or critical advisories. ${counts.moderate} moderate do not block.`);
  } else {
    lines.push(`${blocking.length} high or critical, which fail this run:`, "");
    for (const b of blocking) {
      const kind = b.isDirect ? "direct" : "transitive";
      const fix = b.fixAvailable ? "fix available" : "no fix yet";
      lines.push(`- ${b.name} (${b.severity}, ${kind}, ${fix})`);
      for (const a of b.advisories) lines.push(`  - ${a.title} ${a.url}`);
      for (const through of b.throughs) lines.push(`  - through ${through}`);
    }
  }
  lines.push("", "## Major-version gaps", "");
  if (gaps.length === 0) lines.push("None.");
  for (const g of gaps) lines.push(`- ${g.name} ${g.current} -> ${g.latest}${g.type ? ` (${g.type})` : ""}`);
  if (prereleases.length > 0) {
    lines.push("", "## Prerelease on latest, ignore", "");
    lines.push("prerelease on latest, ignore: never install these unpinned.", "");
    for (const p of prereleases) lines.push(`- ${p.name} ${p.current} -> ${p.latest}`);
  }
  return lines.join("\n");
}

function runNpm(args) {
  // Both commands exit non-zero when they find something, so only stdout matters.
  const result = spawnSync("npm", args, { encoding: "utf8", shell: process.platform === "win32" });
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const auditRun = runNpm(["audit", "--json"]);
  const outdatedRun = runNpm(["outdated", "--json"]);
  const audit = parseAudit(auditRun.stdout);
  const outdated = parseOutdated(outdatedRun.stdout);
  if (!audit.ok || !outdated.ok) {
    const which = !audit.ok ? `audit: ${audit.error.code}` : `outdated: ${outdated.error.code}`;
    const stderr = (!audit.ok ? auditRun.stderr : outdatedRun.stderr).split("\n").slice(0, 5).join("\n");
    console.error(`deps: could not read npm output (${which}). Is the registry reachable?\n${stderr}`);
    process.exit(2);
  }
  const blocking = blockingAdvisories(audit.value);
  const report = formatReport({
    blocking,
    counts: audit.value.metadata.vulnerabilities,
    ...majorGaps(outdated.value),
  });
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
  process.exit(blocking.length === 0 ? 0 : 1);
}
