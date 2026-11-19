import { describe, expect, it } from "vitest";
import { EMAIL_SETTINGS, emailSettingInputSchema, SETTABLE_EMAIL_TYPES } from "./emailSettings";
import { prismaEnum } from "./testing/prismaEnum";

describe("email settings (#211)", () => {
  it("every settable type is a member of the EmailType enum in prisma/schema.prisma", () => {
    const enumValues = prismaEnum("EmailType");
    for (const type of SETTABLE_EMAIL_TYPES) expect(enumValues, type).toContain(type);
  });

  it("lists the four types in page order, and a leader's reminder is not settable", () => {
    expect([...SETTABLE_EMAIL_TYPES]).toEqual(["post_decided", "post_status", "digest", "idea_event"]);
    expect(SETTABLE_EMAIL_TYPES).not.toContain("reviewer_reminder");
  });

  it("gives every type a label and a hint in plain words", () => {
    for (const type of SETTABLE_EMAIL_TYPES) {
      const { label, hint } = EMAIL_SETTINGS[type];
      expect(label, type).not.toBe("");
      expect(hint, type).not.toBe("");
      for (const text of [label, hint]) {
        expect(text).not.toMatch(/petition|vote|—/i);
      }
    }
  });

  it("accepts a settable type with a boolean", () => {
    expect(emailSettingInputSchema.safeParse({ type: "digest", on: false }).success).toBe(true);
  });

  it("rejects an unknown type, reviewer_reminder, a non-boolean, and extra keys", () => {
    expect(emailSettingInputSchema.safeParse({ type: "nope", on: true }).success).toBe(false);
    expect(emailSettingInputSchema.safeParse({ type: "reviewer_reminder", on: true }).success).toBe(false);
    expect(emailSettingInputSchema.safeParse({ type: "digest", on: "yes" }).success).toBe(false);
    expect(emailSettingInputSchema.safeParse({ type: "digest" }).success).toBe(false);
  });
});
