import { describe, expect, it } from "vitest";
import { EMAIL_SETTING_CODES, emailSettingMessage } from "./messages";

// The words for every way a notification setting can fail to save (#211).
describe("notification setting messages (#211)", () => {
  it("has copy for every code", () => {
    for (const code of EMAIL_SETTING_CODES) {
      expect(emailSettingMessage(code).length, code).toBeGreaterThan(0);
    }
  });

  it("uses the plain try-again line, and a sign-in line when signed out", () => {
    for (const code of ["invalid", "cross_origin", "unexpected"] as const) {
      expect(emailSettingMessage(code)).toBe("That didn't go through. Try again.");
    }
    expect(emailSettingMessage("signed_out")).toBe("You're signed out. Sign in again to change this.");
  });

  it("never uses the banned words or an em dash", () => {
    for (const code of EMAIL_SETTING_CODES) {
      expect(emailSettingMessage(code).toLowerCase(), code).not.toMatch(/petition|vote|—/);
    }
  });
});
