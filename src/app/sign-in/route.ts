import { NextResponse, type NextRequest } from "next/server";
import { signInDestination } from "@/auth/gate";

// A route handler, not a page (#177). A redirect() thrown inside <Suspense> after
// streaming began left the page on "Checking sign-in"; a handler answers before
// anything renders. The one place that knows how sign-in starts (#93): src/auth/
// decides where, this only redirects.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { origin, searchParams } = request.nextUrl;
  // `next` is untrusted. Only a single value counts, and the gate cleans it.
  const all = searchParams.getAll("next");
  const next = all.length === 1 ? all[0] : undefined;
  const to = await signInDestination(next, origin);
  const response = NextResponse.redirect(new URL(to ?? "/sign-in/closed", origin), 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
