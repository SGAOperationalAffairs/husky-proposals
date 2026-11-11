import { describe, expect, it } from "vitest";
import { fieldErrors, POST_CODES, postMessage } from "./messages";

describe("post messages (#181)", () => {
  it.each(POST_CODES)("has copy for %s", (code) => {
    expect(postMessage(code).length).toBeGreaterThan(0);
  });

  it("covers every code the action can return", () => {
    expect([...POST_CODES].sort()).toEqual(["cross_origin", "invalid", "pending_limit", "signed_out"]);
  });

  it("does not say anything promises action", () => {
    for (const code of POST_CODES) {
      expect(postMessage(code)).not.toMatch(/petition|will be approved|will be built|we will/i);
    }
  });

  it("maps fields to their copy and reports a form-level error apart", () => {
    expect(fieldErrors(["title", "form", "bogus"])).toEqual({
      errors: { title: "Add a title, up to 120 characters.", bogus: "Check this field." },
      formLevel: true,
    });
  });

  it("reports no form-level error when every field is named", () => {
    expect(fieldErrors(["summary"]).formLevel).toBe(false);
  });
});
