const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];

// The host guard for everything that connects to a test database (issue 104): the
// harness's admin and run clients, `prisma migrate deploy`, and #44's
// prisma/seed.ts. Pure, no I/O. There is no switch to turn it off.
// Never put the URL in a message: it holds the password.
export function assertSafeDatabaseTarget(url: string, allowedHosts: readonly string[]): { host: string } {
  const host = safeHost(url, allowedHosts);
  if (host === undefined) {
    throw new Error(
      `Refusing to connect: ${describeHost(url)} is not localhost or an allowlisted test branch (TEST_DATABASE_ALLOWED_HOSTS). ` +
        "Database tests, migrations, and seeds run only against a local Postgres or the CI test branch (issue 104).",
    );
  }
  return { host };
}

function safeHost(url: string, allowedHosts: readonly string[]): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") return undefined;
  // node-postgres honors these over the authority, so localhost/?host=prod would slip past.
  if (parsed.searchParams.has("host") || parsed.searchParams.has("hostaddr")) return undefined;
  const host = normalizeHost(parsed.hostname);
  // Empty means a socket path. A comma means a list of hosts.
  if (host === "" || host.includes(",")) return undefined;
  if (LOCAL_HOSTS.includes(host) || allowedHosts.includes(host)) return host;
  return undefined;
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

// Hostname only, for the message. Garbage that does not parse is not echoed.
function describeHost(url: string): string {
  try {
    const host = normalizeHost(new URL(url).hostname);
    return host === "" ? "an empty host" : host;
  } catch {
    return "an unreadable database URL";
  }
}
