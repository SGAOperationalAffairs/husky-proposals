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
      "edit_pending",
      "invalid",
      "invalid_transition",
      "no_changes",
      "no_pending_edit",
      "not_approved",
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
    expect(postMessage("not_found")).toBe("We could not find this post. It may have been withdrawn.");
    expect(postMessage("already_changed")).toBe(postMessage("invalid_transition"));
  });

  it("says plainly what happened for the refusals of an edit to an approved post (#295)", () => {
    expect(postMessage("edit_pending")).toBe(
      "You already sent changes to this post. You can edit it again after a reviewer decides.",
    );
    expect(postMessage("no_changes")).toBe("You have not changed anything yet.");
    for (const code of ["not_editable", "not_approved", "invalid_transition", "already_changed"] as const) {
      expect(postMessage(code)).toBe(
        "This post changed while you were editing. Reload the page to see where it stands.",
      );
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
