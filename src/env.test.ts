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

// What dev and production must set besides the database (#210).
const DEPLOYED = {
  RESEND_API_KEY: "re_test_key",
  EMAIL_FROM: "Husky Proposals <updates@example.com>",
  JOBS_SECRET: "a".repeat(32),
  EMAIL_LINK_SECRET: "b".repeat(32),
  SITE_URL: "https://proposals.example.com",
};

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
      parseEnv({
        ...DEPLOYED,
        APP_ENV: "production",
        DATABASE_URL: "postgresql://user:pw@host-pooler.example.com/db",
      }).DATABASE_URL,
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
      expect(parseEnv({ ...DEPLOYED, APP_ENV, DATABASE_URL }).AUTH_STAND_IN, APP_ENV).toBe(false);
    }
  });

  it("accepts AUTH_STAND_IN=0 in production (#45)", () => {
    expect(
      parseEnv({
        ...DEPLOYED,
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
    ...DEPLOYED,
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
    expect(parseEnv({ ...DEPLOYED, APP_ENV: "dev", DATABASE_URL }).AUTH_SGAUTH).toBe(false);
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

describe("email environment (#209)", () => {
  const base = { APP_ENV: "local" };
  const email = {
    RESEND_API_KEY: "re_test_key",
    EMAIL_FROM: "Husky Proposals <updates@example.com>",
    EMAIL_LINK_SECRET: "b".repeat(32),
  };

  it("is all optional on local, so nothing is needed to start", () => {
    const parsed = parseEnv(base);
    expect(parsed.RESEND_API_KEY).toBeUndefined();
    expect(parsed.EMAIL_FROM).toBeUndefined();
    expect(parsed.RESEND_WEBHOOK_SECRET).toBeUndefined();
  });

  it("accepts a named or a bare sender and the three values", () => {
    const parsed = parseEnv({ ...base, ...email, RESEND_WEBHOOK_SECRET: "whsec_abc" });
    expect(parsed.RESEND_API_KEY).toBe("re_test_key");
    expect(parsed.EMAIL_FROM).toBe("Husky Proposals <updates@example.com>");
    expect(parsed.RESEND_WEBHOOK_SECRET).toBe("whsec_abc");
    expect(parseEnv({ ...base, ...email, EMAIL_FROM: "onboarding@resend.dev" }).EMAIL_FROM).toBe(
      "onboarding@resend.dev",
    );
  });

  it("names the variable when a value has the wrong shape", () => {
    expect(() => parseEnv({ ...base, ...email, RESEND_API_KEY: "sk_nope" })).toThrow(/RESEND_API_KEY/);
    expect(() => parseEnv({ ...base, ...email, EMAIL_FROM: "not an address" })).toThrow(/EMAIL_FROM/);
    expect(() => parseEnv({ ...base, RESEND_WEBHOOK_SECRET: "abc" })).toThrow(/RESEND_WEBHOOK_SECRET/);
  });

  it("needs the API key and the sender together, either way round", () => {
    expect(() => parseEnv({ ...base, RESEND_API_KEY: "re_test_key" })).toThrow(/EMAIL_FROM/);
    expect(() => parseEnv({ ...base, EMAIL_FROM: "onboarding@resend.dev" })).toThrow(/RESEND_API_KEY/);
  });

  it("treats an empty string as unset", () => {
    const parsed = parseEnv({ ...base, RESEND_API_KEY: "", EMAIL_FROM: "", RESEND_WEBHOOK_SECRET: "" });
    expect(parsed.RESEND_API_KEY).toBeUndefined();
    expect(parsed.EMAIL_FROM).toBeUndefined();
    expect(parsed.RESEND_WEBHOOK_SECRET).toBeUndefined();
  });
});

describe("email link secret environment (#212)", () => {
  const email = { RESEND_API_KEY: "re_test_key", EMAIL_FROM: "Husky Proposals <updates@example.com>" };

  it("is optional when email is not configured", () => {
    expect(parseEnv({ APP_ENV: "local" }).EMAIL_LINK_SECRET).toBeUndefined();
    expect(parseEnv({ APP_ENV: "local", EMAIL_LINK_SECRET: "" }).EMAIL_LINK_SECRET).toBeUndefined();
  });

  it("refuses to start with RESEND_API_KEY set and no EMAIL_LINK_SECRET", () => {
    expect(() => parseEnv({ APP_ENV: "local", ...email })).toThrow(
      /EMAIL_LINK_SECRET is required when RESEND_API_KEY is set/,
    );
    expect(() => parseEnv({ APP_ENV: "local", ...email, EMAIL_LINK_SECRET: "" })).toThrow(
      /EMAIL_LINK_SECRET/,
    );
  });

  it("refuses a secret shorter than 32 characters", () => {
    expect(() => parseEnv({ APP_ENV: "local", EMAIL_LINK_SECRET: "a".repeat(31) })).toThrow(
      /EMAIL_LINK_SECRET must be at least 32/,
    );
  });

  it("accepts a long enough secret with email configured", () => {
    const parsed = parseEnv({ APP_ENV: "local", ...email, EMAIL_LINK_SECRET: "a".repeat(32) });
    expect(parsed.EMAIL_LINK_SECRET).toBe("a".repeat(32));
  });
});

describe("scheduled jobs environment (#210)", () => {
  const DATABASE_URL = "postgresql://user:pw@host-pooler.example.com/db";
  const deployed = { ...DEPLOYED, DATABASE_URL };

  it("accepts a complete dev and production environment", () => {
    for (const APP_ENV of ["dev", "production"]) {
      const parsed = parseEnv({ ...deployed, APP_ENV });
      expect(parsed.JOBS_SECRET, APP_ENV).toBe(DEPLOYED.JOBS_SECRET);
      expect(parsed.SITE_URL, APP_ENV).toBe("https://proposals.example.com");
    }
  });

  it("requires each of the four on dev and production, naming it", () => {
    for (const APP_ENV of ["dev", "production"]) {
      for (const name of ["RESEND_API_KEY", "EMAIL_FROM", "JOBS_SECRET", "SITE_URL"]) {
        const message = new RegExp(`${name} is required when APP_ENV is dev or production`);
        expect(() => parseEnv({ ...deployed, APP_ENV, [name]: undefined }), `${APP_ENV} ${name}`).toThrow(
          message,
        );
        expect(() => parseEnv({ ...deployed, APP_ENV, [name]: "" }), `${APP_ENV} ${name}`).toThrow(message);
      }
    }
  });

  it("starts on local, test, and preview without them", () => {
    for (const APP_ENV of ["local", "test", "preview"]) {
      const parsed = parseEnv({ APP_ENV, DATABASE_URL });
      expect(parsed.JOBS_SECRET, APP_ENV).toBeUndefined();
      expect(parsed.SITE_URL, APP_ENV).toBeUndefined();
    }
  });

  it("refuses a secret shorter than 32 characters", () => {
    expect(() => parseEnv({ ...deployed, APP_ENV: "dev", JOBS_SECRET: "a".repeat(31) })).toThrow(
      /JOBS_SECRET must be at least 32/,
    );
    expect(() => parseEnv({ APP_ENV: "local", JOBS_SECRET: "a".repeat(31) })).toThrow(/JOBS_SECRET/);
  });

  it("reduces SITE_URL to its origin", () => {
    expect(
      parseEnv({ ...deployed, APP_ENV: "dev", SITE_URL: "https://dev.example.com/some/path/" }).SITE_URL,
    ).toBe("https://dev.example.com");
  });

  it("requires https for SITE_URL on dev and production only", () => {
    for (const APP_ENV of ["dev", "production"]) {
      expect(() => parseEnv({ ...deployed, APP_ENV, SITE_URL: "http://dev.example.com" }), APP_ENV).toThrow(
        /SITE_URL must be an https/,
      );
    }
    expect(parseEnv({ APP_ENV: "local", SITE_URL: "http://localhost:3000" }).SITE_URL).toBe(
      "http://localhost:3000",
    );
  });

  it("names SITE_URL when it is not a URL", () => {
    expect(() => parseEnv({ APP_ENV: "local", SITE_URL: "not a url" })).toThrow(/SITE_URL/);
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
