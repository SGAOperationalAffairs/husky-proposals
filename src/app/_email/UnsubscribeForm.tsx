"use client";

import Link from "next/link";
import { useActionState, useEffect, type MouseEvent } from "react";
import { reportActionOutcome } from "@/app/_errors/reports";
import { Button } from "@/components/Button";
import { PAGE } from "@/components/pageTransition";
import { unsubscribeAction } from "./actions";
import { UNSUBSCRIBE_COPY, unsubscribeFailureText } from "./messages";

// The confirm step of the unsubscribe page (#212). A mail scanner may open the link, so the
// page itself writes nothing: the change happens only when this form is submitted. It is a
// plain <form action>, so it works with no JavaScript. `sample` is a run with no database
// (local and browser tests only): the whole flow shows but saves nothing.
type Props = { token: string; sample: boolean };

export function UnsubscribeForm({ token, sample }: Props) {
  const [outcome, formAction, pending] = useActionState(unsubscribeAction, null);

  useEffect(() => {
    if (outcome) reportActionOutcome(outcome);
  }, [outcome]);

  // aria-disabled, not disabled: the button keeps focus while it saves, and a second tap
  // must not send a second request.
  const guard = (event: MouseEvent<HTMLButtonElement>) => {
    if (pending) event.preventDefault();
  };

  const done = outcome?.ok === true;
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div role="status" className="flex flex-col gap-2">
        {done && (
          <>
            <p className="font-semibold">{UNSUBSCRIBE_COPY.doneTitle}</p>
            <p>
              {UNSUBSCRIBE_COPY.doneBefore}
              <Link
                href="/me/notifications"
                transitionTypes={PAGE}
                className="text-accent-text underline underline-offset-4"
              >
                {UNSUBSCRIBE_COPY.doneLink}
              </Link>
              {UNSUBSCRIBE_COPY.doneAfter}
            </p>
          </>
        )}
      </div>
      {!done && (
        <>
          <p>{UNSUBSCRIBE_COPY.ask}</p>
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="token" value={token} />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" aria-disabled={pending} onClick={guard}>
                {pending ? UNSUBSCRIBE_COPY.stopping : UNSUBSCRIBE_COPY.stop}
              </Button>
              <Button variant="text" href="/me/notifications" transitionTypes={PAGE}>
                {UNSUBSCRIBE_COPY.otherEmails}
              </Button>
            </div>
            {outcome && !outcome.ok && (
              <p role="alert" className="font-semibold text-accent-text">
                {unsubscribeFailureText(outcome.error.code)}
              </p>
            )}
          </form>
          {sample && <p className="text-muted">{UNSUBSCRIBE_COPY.preview}</p>}
        </>
      )}
    </div>
  );
}
