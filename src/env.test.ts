import { describe, expect, it } from "vitest";
import { databaseUrls, parseEnv, parseTestDatabaseEnv } from "./env";

describe("test database environment (#104)", () => {
  it("leaves everything off when nothing is set, with no APP_ENV needed", () => {
    const parsed = parseTestDatabaseEnv({});
    expect(parsed.TEST_DATABASE_URL).toBeUndefined();
    expect(parsed.TEST_DATABASE_ALLOWED_HOSTS).toEqual([]);
    expect(parsed.REQUIRE_TEST_DATABASE).toBe(false);
  });

  it("treats an empty URL as unset", () => {
    expect(parseTestDatabaseEnv({ TEST_DATABASE_URL: "" }).TEST_DATABASE_URL).toBeUndefined();
  });

  it("refuses a URL that is not Postgres, naming the variable", () => {
    expect(() => parseTestDatabaseEnv({ TEST_DATABASE_URL: "mysql://host/db" })).toThrow(/TEST_DATABASE_URL/);
  });

  it("parses the allowed hosts as a trimmed, lowercased list without empties", () => {
    const parsed = parseTestDatabaseEnv({
      TEST_DATABASE_ALLOWED_HOSTS: " EP-One.neon.tech, ,ep-two.neon.tech,",
    });
    expect(parsed.TEST_DATABASE_ALLOWED_HOSTS).toEqual(["ep-one.neon.tech", "ep-two.neon.tech"]);
  });

  it("only accepts 1 or 0 for REQUIRE_TEST_DATABASE", () => {
    expect(parseTestDatabaseEnv({ REQUIRE_TEST_DATABASE: "1" }).REQUIRE_TEST_DATABASE).toBe(true);
    expect(() => parseTestDatabaseEnv({ REQUIRE_TEST_DATABASE: "yes" })).toThrow(/REQUIRE_TEST_DATABASE/);
  });
});

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

describe("database URLs for the Prisma CLI (#44)", () => {
  it("is missing for both, with no APP_ENV needed, so offline commands run", () => {
    expect(databaseUrls({})).toEqual({ pooled: undefined, direct: undefined });
  });

  it("treats an empty URL as unset", () => {
    expect(databaseUrls({ DATABASE_URL: "", DIRECT_URL: "" })).toEqual({
      pooled: undefined,
      direct: undefined,
    });
  });

  it("returns the two URLs it was given", () => {
    const parsed = databaseUrls({
      DATABASE_URL: "postgresql://app@pooler.example/db",
      DIRECT_URL: "postgresql://app@direct.example/db",
    });
    expect(parsed).toEqual({
      pooled: "postgresql://app@pooler.example/db",
      direct: "postgresql://app@direct.example/db",
    });
  });

  it("refuses a URL that is not Postgres, naming the variable", () => {
    expect(() => databaseUrls({ DATABASE_URL: "mysql://x" })).toThrow(/DATABASE_URL/);
    expect(() => databaseUrls({ DIRECT_URL: "mysql://x" })).toThrow(/DIRECT_URL/);
  });
});
