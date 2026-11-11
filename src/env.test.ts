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
    expect(parseEnv({ APP_ENV: "local" })).toEqual({
      APP_ENV: "local",
      AUTH_STAND_IN: false,
      AUTH_SGAUTH: false,
    });
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

  it("requires DATABASE_URL unless APP_ENV is local or test (#60)", () => {
    for (const APP_ENV of ["preview", "dev", "production"]) {
      expect(() => parseEnv({ APP_ENV }), APP_ENV).toThrow(/DATABASE_URL is required unless APP_ENV/);
      expect(() => parseEnv({ APP_ENV, DATABASE_URL: "" }), APP_ENV).toThrow(/DATABASE_URL is required/);
    }
    for (const APP_ENV of ["local", "test"]) expect(() => parseEnv({ APP_ENV }), APP_ENV).not.toThrow();
    expect(
      parseEnv({ APP_ENV: "production", DATABASE_URL: "postgresql://user:pw@host-pooler.example.com/db" })
        .DATABASE_URL,
    ).toBeDefined();
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
      const DATABASE_URL = "postgresql://user:pw@host-pooler.example.com/db";
      expect(parseEnv({ APP_ENV, DATABASE_URL }).AUTH_STAND_IN, APP_ENV).toBe(false);
    }
  });

  it("accepts AUTH_STAND_IN=0 in production (#45)", () => {
    expect(
      parseEnv({
        APP_ENV: "production",
        AUTH_STAND_IN: "0",
        DATABASE_URL: "postgresql://user:pw@host-pooler.example.com/db",
      }).AUTH_STAND_IN,
    ).toBe(false);
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

describe("SGAuth sign-in environment (#177)", () => {
  const DATABASE_URL = "postgresql://user:pw@host-pooler.example.com/db";
  const sgauth = {
    APP_ENV: "dev",
    AUTH_SGAUTH: "1",
    SGAUTH_URL: "https://dev.auth.northeasternsga.com",
    SGAUTH_COOKIE_NAME: "__Secure-sgauth-dev.session_token",
    DATABASE_URL,
  };

  it("accepts the dev settings", () => {
    const parsed = parseEnv(sgauth);
    expect(parsed.AUTH_SGAUTH).toBe(true);
    expect(parsed.SGAUTH_URL).toBe("https://dev.auth.northeasternsga.com");
    expect(parsed.SGAUTH_COOKIE_NAME).toBe("__Secure-sgauth-dev.session_token");
  });

  it("is off by default and needs no SGAuth variables then", () => {
    expect(parseEnv({ APP_ENV: "dev", DATABASE_URL }).AUTH_SGAUTH).toBe(false);
  });

  it("is refused outside dev, naming SGAuth", () => {
    for (const APP_ENV of ["local", "test", "preview", "production"]) {
      expect(() => parseEnv({ ...sgauth, APP_ENV }), APP_ENV).toThrow(
        /SGAuth sign-in runs only when APP_ENV is dev/,
      );
    }
  });

  it("requires SGAUTH_URL and SGAUTH_COOKIE_NAME when on, naming the variable", () => {
    for (const name of ["SGAUTH_URL", "SGAUTH_COOKIE_NAME"]) {
      expect(() => parseEnv({ ...sgauth, [name]: undefined }), name).toThrow(new RegExp(name));
      expect(() => parseEnv({ ...sgauth, [name]: "" }), name).toThrow(new RegExp(name));
    }
  });

  it("requires an https SGAUTH_URL when on", () => {
    expect(() => parseEnv({ ...sgauth, SGAUTH_URL: "http://dev.auth.northeasternsga.com" })).toThrow(
      /SGAUTH_URL must be an https/,
    );
    expect(() => parseEnv({ ...sgauth, SGAUTH_URL: "not a url" })).toThrow(/SGAUTH_URL/);
  });

  it("refuses a cookie name with a character a cookie name cannot hold", () => {
    for (const SGAUTH_COOKIE_NAME of ["a;b", "a=b", "a b", "a,b"]) {
      expect(() => parseEnv({ ...sgauth, SGAUTH_COOKIE_NAME }), SGAUTH_COOKIE_NAME).toThrow(
        /SGAUTH_COOKIE_NAME/,
      );
    }
  });

  it("only accepts 1 or 0 for AUTH_SGAUTH", () => {
    expect(() => parseEnv({ ...sgauth, AUTH_SGAUTH: "yes" })).toThrow(/AUTH_SGAUTH/);
  });

  it("keeps the stand-in refusal outside local and test", () => {
    expect(() => parseEnv({ ...sgauth, AUTH_STAND_IN: "1" })).toThrow(/The sign-in stand-in runs only/);
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
