import type { Metadata } from "next";
import { SignInClosed } from "../SignInClosed";

export const metadata: Metadata = { title: "Sign in" };

// Where /sign-in lands when nothing can sign you in (#93, #177). Static: it reads no
// session. safeNextPath refuses /sign-in/... as a next, so it can never loop.
export default function SignInClosedPage() {
  return <SignInClosed />;
}
