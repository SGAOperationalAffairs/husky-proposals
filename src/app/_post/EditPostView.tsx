import { Button } from "@/components/Button";
import { PAGE } from "@/components/pageTransition";
import type { EditPostData } from "./present";
import { PostForm } from "./PostForm";

// The edit page's body (#128, #295). A declined post gets the reviewer's reason, then the
// form. An approved post gets the edit form, or, while an edit waits, a line saying so with
// no form; after a declined edit it gets the reason first, then the form holding the
// declined words. A taken-down post gets its reason and no form (#286). Any other status
// (a reload after sending, or an old link) gets a line saying where the post stands, and no
// form. No white panel: the form sits on the page, like /post.
type Props = { data: EditPostData; pendingCount: number };

const STANDING = {
  pending: {
    title: "Waiting for review",
    text: "There is nothing to change yet. If it is declined, you can edit it here.",
  },
  // An approved post with an edit waiting (#295).
  edit_pending: {
    title: "Changes waiting for review",
    text: "Students still see the approved version. You can edit it again after a reviewer decides.",
  },
  withdrawn: {
    title: "Withdrawn",
    text: "You withdrew this post. It will not be reviewed.",
  },
  // Final (#286): a take-down cannot be edited, sent again, or withdrawn.
  taken_down: {
    title: "Taken down",
    text: "A reviewer took this idea off the ideas list. It can no longer be edited or sent for review again.",
  },
} as const;

export function EditPostView({ data, pendingCount }: Props) {
  const approved = data.reviewStatus === "approved";
  const editWaiting = approved && data.edit?.state === "pending";

  if (editWaiting || !(approved || data.reviewStatus === "declined")) {
    const { title, text } =
      STANDING[
        editWaiting ? "edit_pending" : (data.reviewStatus as keyof Omit<typeof STANDING, "edit_pending">)
      ];
    return (
      <>
        <header className="flex flex-col gap-3">
          <h1 className="heading text-6xl @3xl:text-8xl">{title}</h1>
          <p className="text-muted">{text}</p>
        </header>
        {data.reviewStatus === "taken_down" && (
          <section aria-label="Why it was taken down" className="flex flex-col gap-2 bordered p-card">
            <p className="text-sm font-bold">Why it was taken down</p>
            <p>{data.reason ?? "The reviewer did not leave a reason."}</p>
          </section>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" href="/me" transitionTypes={PAGE}>
            Back to my ideas
          </Button>
          {approved && data.number !== null && (
            <Button variant="text" href={`/ideas/${data.number}`} transitionTypes={PAGE}>
              See the idea
            </Button>
          )}
        </div>
      </>
    );
  }

  if (approved) {
    const declined = data.edit?.state === "declined" ? data.edit : null;
    return (
      <>
        <header className="flex flex-col gap-3">
          <h1 className="heading text-6xl @3xl:text-8xl">Edit your post</h1>
          <p className="text-muted">
            Students see your post as it is now until a reviewer approves your changes. Support and follows
            stay with it.
          </p>
        </header>
        {declined && (
          <section
            aria-label="Why your changes were not approved"
            className="flex flex-col gap-2 bordered p-card"
          >
            <p className="text-sm font-bold">Why your changes were not approved</p>
            <p>{declined.reason ?? "The reviewer did not leave a reason."}</p>
            <p className="text-muted">
              The approved version is still public. Change what the reviewer asked for, then send your changes
              again.
            </p>
          </section>
        )}
        <PostForm
          pendingCount={pendingCount}
          edit={{ ideaId: data.ideaId, values: data.values, mode: "edit", number: data.number }}
        />
      </>
    );
  }

  const whyLabel = data.sentBack ? "Why it was sent back" : "Why it was not approved";
  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="heading text-6xl @3xl:text-8xl">Edit your post</h1>
        <p className="text-muted">
          This post is not public. Only you, the board&apos;s reviewer, and the VP of Campus Affairs can see
          it.
        </p>
      </header>
      <section aria-label={whyLabel} className="flex flex-col gap-2 bordered p-card">
        <p className="text-sm font-bold">{whyLabel}</p>
        <p>{data.reason ?? "The reviewer did not leave a reason."}</p>
        <p className="text-muted">Change what the reviewer asked for, then send it for review again.</p>
      </section>
      <PostForm pendingCount={pendingCount} edit={{ ideaId: data.ideaId, values: data.values }} />
    </>
  );
}
