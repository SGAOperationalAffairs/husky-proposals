import { describe, expect, it } from "vitest";
import { toSession } from "./contract";
import { STAND_IN_SLUGS, STAND_IN_USERS, standInResponse } from "./standIn";

const now = new Date("2026-10-31T12:00:00.000Z");

const EXPECTED: Record<string, { vp: boolean; exec: boolean; leads: string[]; memberOf: string[] }> = {
  student: { vp: false, exec: false, leads: [], memberOf: [] },
  "dab-member": { vp: false, exec: false, leads: [], memberOf: ["DAB"] },
  "dab-chair": { vp: false, exec: false, leads: ["DAB"], memberOf: [] },
  "csc-director": { vp: false, exec: false, leads: ["CSC"], memberOf: [] },
  vp: { vp: true, exec: true, leads: [], memberOf: [] },
  "other-position": { vp: false, exec: false, leads: [], memberOf: [] },
  "exec-board": { vp: false, exec: true, leads: [], memberOf: [] },
  "exec-dab-chair": { vp: false, exec: true, leads: ["DAB"], memberOf: [] },
};

describe("sign-in stand-in (#45)", () => {
  it("covers the expected test users", () => {
    expect([...STAND_IN_SLUGS].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("builds a body for every test user that passes the contract and maps to the right roles", () => {
    for (const slug of STAND_IN_SLUGS) {
      const result = toSession(standInResponse(slug, now));
      expect(result.ok, slug).toBe(true);
      if (!result.ok) continue;
      const want = EXPECTED[slug]!;
      expect(result.session.roles, slug).toEqual({
        vpCampusAffairs: want.vp,
        executiveBoard: want.exec,
        leads: want.leads,
        memberOf: want.memberOf,
      });
    }
  });

  it("returns null for an unknown or missing slug", () => {
    expect(standInResponse("nobody", now)).toBeNull();
    expect(standInResponse(undefined, now)).toBeNull();
  });

  it("uses only reserved example.com addresses", () => {
    for (const user of STAND_IN_USERS) expect(user.email).toMatch(/@example\.com$/);
  });

  it("sorts positions by key", () => {
    const body = standInResponse("dab-chair", now) as { positions: { key: string }[] };
    const keys = body.positions.map((p) => p.key);
    expect(keys).toEqual([...keys].sort());
  });
});
