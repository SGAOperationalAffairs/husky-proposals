import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("environment (#26)", () => {
  it("accepts a valid local environment", () => {
    expect(parseEnv({ APP_ENV: "local" })).toEqual({ APP_ENV: "local", AUTH_STAND_IN: false });
  });

  it("refuses to start when APP_ENV is missing or unknown", () => {
    expect(() => parseEnv({})).toThrow(/APP_ENV/);
    expect(() => parseEnv({ APP_ENV: "staging" })).toThrow(/APP_ENV/);
  });

  it("allows the sign-in stand-in only in local and test", () => {
    expect(parseEnv({ APP_ENV: "test", AUTH_STAND_IN: "1" }).AUTH_STAND_IN).toBe(true);
    for (const APP_ENV of ["preview", "dev", "production"]) {
      expect(() => parseEnv({ APP_ENV, AUTH_STAND_IN: "1" })).toThrow(/stand-in/);
    }
  });

  it("keeps the sign-in stand-in off by default in every environment (#45)", () => {
    for (const APP_ENV of ["local", "test", "preview", "dev", "production"]) {
      expect(parseEnv({ APP_ENV }).AUTH_STAND_IN, APP_ENV).toBe(false);
    }
  });

  it("accepts AUTH_STAND_IN=0 in production (#45)", () => {
    expect(parseEnv({ APP_ENV: "production", AUTH_STAND_IN: "0" }).AUTH_STAND_IN).toBe(false);
  });

  it("names the stand-in in the refusal for preview, dev, and production (#45)", () => {
    for (const APP_ENV of ["preview", "dev", "production"]) {
      expect(() => parseEnv({ APP_ENV, AUTH_STAND_IN: "1" }), APP_ENV).toThrow(
        /The sign-in stand-in runs only when APP_ENV is local or test/,
      );
    }
  });

  it("only accepts 1 or 0 for AUTH_STAND_IN", () => {
    expect(() => parseEnv({ APP_ENV: "local", AUTH_STAND_IN: "yes" })).toThrow(/AUTH_STAND_IN/);
  });
});
