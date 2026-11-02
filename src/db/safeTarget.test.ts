import { describe, expect, it } from "vitest";
import { assertSafeDatabaseTarget } from "./safeTarget";

const NEON = "ep-test-123.us-east-2.aws.neon.tech";

describe("test database guard (#104)", () => {
  it("accepts localhost in each spelling", () => {
    for (const url of [
      "postgresql://localhost:5432/postgres",
      "postgres://u:p@127.0.0.1/postgres",
      "postgresql://u:p@[::1]:5432/postgres",
    ]) {
      expect(() => assertSafeDatabaseTarget(url, []), url).not.toThrow();
    }
  });

  it("accepts an allowlisted host, ignoring case", () => {
    expect(assertSafeDatabaseTarget(`postgresql://u:p@${NEON.toUpperCase()}/neondb`, [NEON])).toEqual({
      host: NEON,
    });
  });

  it("refuses the same host when it is not allowlisted", () => {
    expect(() => assertSafeDatabaseTarget(`postgresql://u:p@${NEON}/neondb`, [])).toThrow(
      /Refusing to connect/,
    );
  });

  it("refuses the pooler twin, a suffix trick, and a different host", () => {
    const allowed = [NEON];
    for (const host of [
      NEON.replace("ep-test-123", "ep-test-123-pooler"),
      `${NEON}.evil.com`,
      "db.example.com",
    ]) {
      expect(() => assertSafeDatabaseTarget(`postgresql://u:p@${host}/neondb`, allowed), host).toThrow(
        /Refusing to connect/,
      );
    }
  });

  it("refuses a URL that carries its own host or hostaddr", () => {
    for (const query of ["host=db.example.com", "hostaddr=10.0.0.1"]) {
      expect(() => assertSafeDatabaseTarget(`postgresql://localhost:5432/postgres?${query}`, [])).toThrow(
        /Refusing to connect/,
      );
    }
  });

  it("refuses an empty host, another protocol, and garbage", () => {
    for (const url of ["postgresql:///postgres", "mysql://localhost/db", "not a url", ""]) {
      expect(() => assertSafeDatabaseTarget(url, []), url).toThrow(/Refusing to connect/);
    }
  });

  it("never puts the password in the message", () => {
    const attempts = [
      `postgresql://user:s3cret-pw@${NEON}/neondb`,
      "postgresql://user:s3cret-pw@@@bad host/db",
    ];
    for (const url of attempts) {
      try {
        assertSafeDatabaseTarget(url, []);
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).not.toContain("s3cret-pw");
      }
    }
  });
});
