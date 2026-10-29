// Runs once when a server instance starts, before it handles requests.
// A missing or invalid environment stops the server here (#26).
export async function register() {
  const { env } = await import("./env");
  env();
}
