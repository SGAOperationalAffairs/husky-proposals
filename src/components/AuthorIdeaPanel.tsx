import { Button } from "./Button";
import { PAGE } from "./pageTransition";

// "Your post" on an approved idea's page, shown to its author only (#295). It is the way in
// for editing an approved post: edit, see the changes that wait, or see why they were not
// approved. Presentational: the server section decides the state. Bordered on the page
// background, not a white box.
type Props = { ideaId: string; edit: "none" | "pending" | "declined" };

const BODY = {
  none: {
    text: "You posted this. You can edit it. A reviewer checks every change before students see it.",
    label: "Edit your post",
    variant: "line",
  },
  pending: {
    text: "Your changes are waiting for review. Students see the version on this page until a reviewer approves them.",
    label: "See your changes",
    variant: "text",
  },
  declined: {
    text: "A reviewer did not approve your changes. Students still see the version on this page.",
    label: "See why",
    variant: "text",
  },
} as const;

export function AuthorIdeaPanel({ ideaId, edit }: Props) {
  const { text, label, variant } = BODY[edit];
  return (
    <section aria-label="Your post" className="flex flex-col items-start gap-3 bordered p-card">
      <h2 className="heading text-3xl">Your post</h2>
      <p>{text}</p>
      <Button variant={variant} href={`/me/ideas/${ideaId}/edit`} transitionTypes={PAGE}>
        {label}
      </Button>
    </section>
  );
}
