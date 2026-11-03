import { describe, expect, it } from "vitest";
import { blockingAdvisories, formatReport, majorGaps, parseAudit, parseOutdated } from "./check-deps.mjs";

// Invented npm 10 audit output. Extra fields are on purpose: npm's shape is not a contract.
const audit = (vulnerabilities) =>
  JSON.stringify({
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
    },
  });

const entry = (name, severity, extra = {}) => ({
  name,
  severity,
  isDirect: false,
  via: [],
  effects: [],
  range: "*",
  nodes: [],
  fixAvailable: false,
  ...extra,
});

const parsedAudit = (vulnerabilities) => {
  const result = parseAudit(audit(vulnerabilities));
  if (!result.ok) throw new Error(`fixture did not parse: ${result.error.code}`);
  return result.value;
};

describe("dependency check (#119)", () => {
  describe("audit", () => {
    it("reports no blocking advisories when only moderate entries exist", () => {
      const report = parsedAudit({
        alpha: entry("alpha", "moderate"),
        beta: entry("beta", "low"),
      });
      expect(blockingAdvisories(report)).toEqual([]);
    });

    it("returns high and critical entries, critical first, then by name", () => {
      const report = parsedAudit({
        zeta: entry("zeta", "critical", {
          isDirect: true,
          fixAvailable: true,
          via: [{ title: "Remote code execution", url: "https://example.test/a", severity: "critical" }],
        }),
        beta: entry("beta", "high", {
          via: [{ title: "Path traversal", url: "https://example.test/b", severity: "high" }],
        }),
        alpha: entry("alpha", "high", { via: ["zeta"] }),
        mid: entry("mid", "moderate"),
      });
      const blocking = blockingAdvisories(report);
      expect(blocking.map((b) => b.name)).toEqual(["zeta", "alpha", "beta"]);
      expect(blocking[0]).toMatchObject({
        severity: "critical",
        isDirect: true,
        fixAvailable: true,
        advisories: [{ title: "Remote code execution", url: "https://example.test/a" }],
        throughs: [],
      });
      expect(blocking[1]).toMatchObject({ advisories: [], throughs: ["zeta"] });
    });

    it("returns not_json for text that is not JSON", () => {
      expect(parseAudit("npm ERR! network")).toEqual({ ok: false, error: { code: "not_json" } });
    });

    it("returns unexpected_shape for JSON that is not an audit report", () => {
      expect(parseAudit(JSON.stringify({ error: { code: "ENOTFOUND" } }))).toEqual({
        ok: false,
        error: { code: "unexpected_shape" },
      });
    });
  });

  describe("outdated", () => {
    const outdated = (rows) => {
      const result = parseOutdated(JSON.stringify(rows));
      if (!result.ok) throw new Error(`fixture did not parse: ${result.error.code}`);
      return result.value;
    };

    it("counts a higher major as a gap", () => {
      const { gaps } = majorGaps(
        outdated({ eslint: { current: "9.39.5", wanted: "9.39.5", latest: "10.1.0" } }),
      );
      expect(gaps.map((g) => g.name)).toEqual(["eslint"]);
    });

    it("does not count a minor or patch gap", () => {
      const { gaps } = majorGaps(outdated({ zod: { current: "9.1.0", wanted: "9.4.0", latest: "9.4.0" } }));
      expect(gaps).toEqual([]);
    });

    it("counts a higher minor as a gap for a 0.x version", () => {
      const { gaps } = majorGaps(
        outdated({ pdfkit: { current: "0.20.1", wanted: "0.20.1", latest: "0.21.0" } }),
      );
      expect(gaps.map((g) => g.name)).toEqual(["pdfkit"]);
    });

    it("falls back to wanted when current is missing", () => {
      const { gaps } = majorGaps(outdated({ missing: { wanted: "1.2.0", latest: "2.0.0" } }));
      expect(gaps.map((g) => g.name)).toEqual(["missing"]);
    });

    it("lists a prerelease latest apart from the gaps", () => {
      const { gaps, prereleases } = majorGaps(
        outdated({ prisma: { current: "7.10.1", wanted: "7.10.1", latest: "8.0.0-rc.1" } }),
      );
      expect(gaps).toEqual([]);
      expect(prereleases.map((p) => p.name)).toEqual(["prisma"]);
    });

    it("parses empty stdout as nothing outdated", () => {
      expect(parseOutdated("")).toEqual({ ok: true, value: {} });
      expect(majorGaps({})).toEqual({ gaps: [], prereleases: [] });
    });

    it("returns not_json and unexpected_shape", () => {
      expect(parseOutdated("oops")).toEqual({ ok: false, error: { code: "not_json" } });
      expect(parseOutdated(JSON.stringify({ a: "b" }))).toEqual({
        ok: false,
        error: { code: "unexpected_shape" },
      });
    });
  });

  describe("report", () => {
    it("shows counts, blocking advisories, gaps, and prereleases", () => {
      const text = formatReport({
        blocking: [
          {
            name: "zeta",
            severity: "critical",
            isDirect: true,
            fixAvailable: true,
            advisories: [{ title: "Remote code execution", url: "https://example.test/a" }],
            throughs: [],
          },
        ],
        counts: { info: 0, low: 1, moderate: 17, high: 0, critical: 1, total: 19 },
        gaps: [{ name: "eslint", current: "9.39.5", latest: "10.1.0", type: "devDependencies" }],
        prereleases: [{ name: "prisma", current: "7.10.1", latest: "8.0.0-rc.1" }],
      });
      expect(text).toContain("17 moderate");
      expect(text).toContain("zeta");
      expect(text).toContain("https://example.test/a");
      expect(text).toContain("eslint");
      expect(text).toContain("prerelease on latest, ignore");
      expect(text).toContain("prisma");
    });

    it("says nothing blocks when no high or critical advisory exists", () => {
      const text = formatReport({
        blocking: [],
        counts: { info: 0, low: 0, moderate: 3, high: 0, critical: 0, total: 3 },
        gaps: [],
        prereleases: [],
      });
      expect(text).toContain("No high or critical advisories");
      expect(text).toContain("3 moderate");
    });
  });
});
