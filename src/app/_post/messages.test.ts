import { describe, expect, it } from "vitest";
import { fieldErrors, POST_CODES, postMessage, RESUBMIT_SIGNED_OUT, WITHDRAW_SIGNED_OUT } from "./messages";

describe("post messages (#181)", () => {
  it.each(POST_CODES)("has copy for %s", (code) => {
    expect(postMessage(code).length).toBeGreaterThan(0);
  });

  it("covers every code the action can return", () => {
    expect([...POST_CODES].sort()).toEqual([
      "already_changed",
      "cross_origin",
      "invalid",
      "invalid_transition",
      "not_author",
      "not_editable",
      "not_found",
      "own_post",
      "pending_limit",
      "reason_required",
      "signed_out",
      "unexpected",
    ]);
  });

  it("does not say anything promises action", () => {
    for (const text of [...POST_CODES.map(postMessage), RESUBMIT_SIGNED_OUT, WITHDRAW_SIGNED_OUT]) {
      expect(text).not.toMatch(/petition|will be approved|will be built|we will/i);
    }
  });

  it("says plainly what happened for the edit refusals (#128)", () => {
    expect(postMessage("not_editable")).toBe("This idea was approved, so it can no longer be edited.");
    expect(postMessage("not_found")).toBe("We could not find this post. It may have been withdrawn.");
    expect(postMessage("already_changed")).toBe(postMessage("invalid_transition"));
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
