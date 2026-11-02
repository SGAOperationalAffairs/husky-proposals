import Link from "next/link";
import { PAGE } from "@/components/pageTransition";

// The "Have an idea for campus?" block (#55). The whole block is the link, so
// any part of it takes a student to the post form. Red, with no border; hover
// underlines the call to action.
export function SubmitYours() {
  return (
    <Link
      transitionTypes={PAGE}
      href="/post"
      className="group block bg-accent p-card text-on-accent motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-1"
    >
      <span className="block heading text-4xl">Have an idea for campus?</span>
      <span className="mt-2 block font-semibold underline-offset-4 group-hover:underline">Submit yours</span>
    </Link>
  );
}
