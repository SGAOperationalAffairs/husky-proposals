import { describe, expect, it } from "vitest";
import { toSession } from "./contract";

const body = {
  user: {
    id: "7b0a5c1e-4a52-4d6e-9d2b-0a1f6c3e8b11",
    email: "sam@example.com",
    name: "Sam Rivera",
    preferredName: null,
    isAdmin: false,
    isPrimaryAdmin: false,
  },
  positions: [{ key: "chair-of-dining-advisory-board", name: "Chair of the Dining Advisory Board" }],
  session: {
    id: "s1",
    expiresAt: "2026-11-01T00:00:00.000Z",
    absoluteExpiresAt: "2026-11-30T00:00:00.000Z",
    createdAt: "2026-10-31T00:00:00.000Z",
  },
};

describe("SGAuth session contract (#45)", () => {
  it("parses a valid body into a session with roles", () => {
    const result = toSession(body);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.user).toEqual({
      id: body.user.id,
      email: "sam@example.com",
      name: "Sam Rivera",
    });
    expect(result.session.roles.leads).toEqual(["DAB"]);
  });

  it("prefers the preferred name", () => {
    const result = toSession({ ...body, user: { ...body.user, preferredName: "Sammy" } });
    expect(result.ok && result.session.user.name).toBe("Sammy");
  });

  it("rejects a missing user id, a non-UUID id, and non-array positions", () => {
    const noId: Partial<typeof body.user> = { ...body.user };
    delete noId.id;
    for (const bad of [
      { ...body, user: noId },
      { ...body, user: { ...body.user, id: "not-a-uuid" } },
      { ...body, positions: "chair" },
    ]) {
      expect(toSession(bad)).toEqual({ ok: false, error: { code: "invalid_session_response" } });
    }
  });

  it("rejects a body that is not an object", () => {
    expect(toSession(null)).toEqual({ ok: false, error: { code: "invalid_session_response" } });
  });

  it("accepts and strips a field SGAuth adds later", () => {
    const result = toSession({ ...body, extra: "x", user: { ...body.user, nickname: "x" } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(JSON.stringify(result.session)).not.toContain("nickname");
  });

  it("grants nothing for SGAuth admin flags", () => {
    const result = toSession({
      ...body,
      user: { ...body.user, isAdmin: true, isPrimaryAdmin: true },
      positions: [],
    });
    expect(result.ok && result.session.roles).toEqual({ vpCampusAffairs: false, leads: [], memberOf: [] });
  });
});
