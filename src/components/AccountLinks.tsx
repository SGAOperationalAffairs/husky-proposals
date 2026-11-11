import { signOut } from "@/app/_account/actions";
import { Button, buttonLook } from "@/components/Button";
import { SignInLink } from "@/components/SignInLink";

// The account control at the end of the tab row (#177). Presentational: NavTabs
// reads the session and passes what to show. Both links are plain anchors, never
// next/link: /sign-in redirects off-site, and a prefetched /logout would sign nobody
// out. SGAuth sign-out is a link (signOutHref); the local stand-in uses a form.
export function AccountLinks({
  canSignIn,
  name,
  signOutHref,
}: {
  canSignIn: boolean;
  name: string | null;
  signOutHref: string | null;
}) {
  if (!canSignIn) return null;
  if (name === null) return <SignInLink />;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted">{name}</span>
      {signOutHref ? (
        <a href={signOutHref} className={buttonLook("text", "sm")}>
          Sign out
        </a>
      ) : (
        <form action={signOut}>
          <Button type="submit" variant="text" size="sm">
            Sign out
          </Button>
        </form>
      )}
    </div>
  );
}
