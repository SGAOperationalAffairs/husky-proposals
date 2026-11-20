"use client";

import { Dialog } from "@base-ui/react/dialog";
import { BOARDS, type BoardCode } from "@/core/boards";
import { EMAIL_SETTINGS } from "@/core/emailSettings";
import { Button } from "./Button";
import { PAGE } from "./pageTransition";

// Learn more on a student's own pending or declined post (#200). The post has no public
// page, so the detail opens in a dialog on My ideas instead. A declined post shows the
// whole reason, since the card cuts it at two lines, and a way to edit and resubmit. A
// pending post says who reviews it and when, without promising a date. It shows no support
// count: the author's own count is still undecided. It makes no request, only shows what the
// page already has. A sheet from the bottom on phones, a small dialog wider (.sheet).
export type PostStandingDialogData = {
  title: string;
  board: BoardCode;
  // sent_back and taken_down are what a reviewer did to an approved post (#286).
  review: "pending" | "declined" | "sent_back" | "taken_down";
  declineReason?: string;
  // The author-only edit page (#128). Without it, a declined post offers only Close.
  editHref?: string;
  // The "when" line, from studentWaitText.
  waitText?: string;
};

const PRIVATE_NOTE = "text-sm text-muted";

export function PostStandingDialog({
  title,
  board,
  review,
  declineReason,
  editHref,
  waitText,
}: PostStandingDialogData) {
  const b = BOARDS[board];
  const takenDown = review === "taken_down";
  // A declined or sent-back post can be edited and sent again. A taken-down one is final.
  const declined = review === "declined" || review === "sent_back";
  const reasonHeading =
    review === "sent_back"
      ? "Why it was sent back"
      : takenDown
        ? "Why it was taken down"
        : "Why it was not approved";
  const heading =
    review === "sent_back"
      ? "Sent back"
      : takenDown
        ? "Taken down"
        : declined
          ? "Not approved"
          : "Waiting for review";
  return (
    <Dialog.Root>
      <Dialog.Trigger
        render={<button type="button" className="relative z-10 text-sm font-bold whitespace-nowrap" />}
      >
        Learn more<span className="sr-only"> about your post {title}</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup
          data-board={b.color}
          className="sheet board-accent flex flex-col gap-4 bg-surface text-ink"
        >
          <Dialog.Title className="heading text-4xl">{heading}</Dialog.Title>
          <p className="font-bold">{title}</p>
          {declined || takenDown ? (
            <>
              <section className="flex flex-col gap-1">
                <h3 className="font-bold">{reasonHeading}</h3>
                <p className="max-w-prose">{declineReason || "The reviewer did not leave a reason."}</p>
              </section>
              <p className="max-w-prose">
                {takenDown
                  ? "This post can no longer be edited or sent for review again."
                  : "Change what the reviewer asked for, then send it for review again."}
              </p>
              <p className={PRIVATE_NOTE}>
                This post is not public. Only you, the board&apos;s reviewer, and the VP of Campus Affairs can
                see it.
              </p>
            </>
          ) : (
            <>
              <p className="max-w-prose">
                The {b.name}&apos;s chair or director, or the VP of Campus Affairs, reads every new post
                before it goes up.
              </p>
              {waitText && <p className="max-w-prose">{waitText}</p>}
              <p className="max-w-prose">
                If it is approved, it goes up on the ideas wall for every student to see. If it is not, you
                will see why, and you can edit it and send it again.
              </p>
              <p className="max-w-prose">
                We email you when it is decided, unless you turned off {EMAIL_SETTINGS.post_decided.label} in{" "}
                <Button variant="text" size="sm" href="/me/notifications" transitionTypes={PAGE}>
                  Notification settings
                </Button>
                .
              </p>
              <p className={PRIVATE_NOTE}>
                Until then, only you, the board&apos;s reviewer, and the VP of Campus Affairs can see it.
              </p>
            </>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Dialog.Close render={<Button />}>Close</Dialog.Close>
            {declined && editHref && (
              <Button variant="primary" href={editHref} transitionTypes={PAGE}>
                Edit and resubmit
              </Button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
