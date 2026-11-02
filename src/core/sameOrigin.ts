// Is a state-changing request from our own origin? (#54). Compares the Origin header
// with the Host header, including the port. Anything unreadable is refused.
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  return parsed.host.toLowerCase() === host.toLowerCase();
}
