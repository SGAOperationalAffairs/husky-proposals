import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./sameOrigin";

// State-changing requests must come from our own origin (#54). The SGAuth cookie is
// shared by every SGA subdomain, so a request from another site must not write.
// A missing Origin fails closed: a browser always sends one on a POST.

describe("isSameOrigin (#54)", () => {
  it("accepts a request whose origin is this host", () => {
    expect(isSameOrigin("https://proposals.northeasternsga.com", "proposals.northeasternsga.com")).toBe(true);
  });

  it("accepts localhost with its port", () => {
    expect(isSameOrigin("http://localhost:3000", "localhost:3000")).toBe(true);
  });

  it("refuses another site", () => {
    expect(isSameOrigin("https://evil.example.com", "proposals.northeasternsga.com")).toBe(false);
  });

  it("refuses a different port on the same host", () => {
    expect(isSameOrigin("http://localhost:4000", "localhost:3000")).toBe(false);
  });

  it("refuses a sibling SGA subdomain", () => {
    expect(isSameOrigin("https://other.northeasternsga.com", "proposals.northeasternsga.com")).toBe(false);
  });

  it("fails closed when the origin or host is missing or the string is opaque", () => {
    expect(isSameOrigin(null, "proposals.northeasternsga.com")).toBe(false);
    expect(isSameOrigin("https://proposals.northeasternsga.com", null)).toBe(false);
    expect(isSameOrigin("null", "proposals.northeasternsga.com")).toBe(false);
    expect(isSameOrigin("not a url", "proposals.northeasternsga.com")).toBe(false);
  });
});
