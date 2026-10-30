import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("environment (#26)", () => {
  it("accepts a valid local environment", () => {
    expect(parseEnv({ APP_ENV: "local" })).toEqual({ APP_ENV: "local", AUTH_STAND_IN: false });
  });

  it("accepts the two database URLs, and neither is required (#43)", () => {
    const parsed = parseEnv({
      APP_ENV: "test",
      DATABASE_URL: "postgresql://user:pw@host-pooler.example.com/db?sslmode=require",
      DIRECT_URL: "postgres://user:pw@host.example.com/db",
    });
    expect(parsed.DATABASE_URL).toBe("postgresql://user:pw@host-pooler.example.com/db?sslmode=require");
    expect(parsed.DIRECT_URL).toBe("postgres://user:pw@host.example.com/db");
    expect(parseEnv({ APP_ENV: "test" }).DATABASE_URL).toBeUndefined();
  });

  it("treats an empty database URL as unset (#43)", () => {
    const parsed = parseEnv({ APP_ENV: "test", DATABASE_URL: "", DIRECT_URL: "" });
    expect(parsed.DATABASE_URL).toBeUndefined();
    expect(parsed.DIRECT_URL).toBeUndefined();
  });

  it("refuses a database URL that is not Postgres, naming the variable (#43)", () => {
    expect(() => parseEnv({ APP_ENV: "test", DATABASE_URL: "mysql://host/db" })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ APP_ENV: "test", DIRECT_URL: "nope" })).toThrow(/DIRECT_URL/);
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

  it("only accepts 1 or 0 for AUTH_STAND_IN", () => {
    expect(() => parseEnv({ APP_ENV: "local", AUTH_STAND_IN: "yes" })).toThrow(/AUTH_STAND_IN/);
  });
});
