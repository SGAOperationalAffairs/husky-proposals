import Link from "next/link";
import { buttonLook } from "@/components/Button";

// Shown when nothing can sign you in yet, which is production today (#93).
export function SignInClosed() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="heading text-6xl">Sign-in isn&apos;t open yet.</h1>
        <p className="mt-3 text-muted">You can still browse every idea without signing in.</p>
      </div>
      <div>
        <Link href="/" className={buttonLook("line")}>
          Browse ideas
        </Link>
      </div>
    </main>
  );
}
