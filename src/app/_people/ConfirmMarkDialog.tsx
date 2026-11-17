"use client";

import { Dialog } from "@base-ui/react/dialog";
import { CircleDashed, PauseCircle, UserCheck, type LucideIcon } from "lucide-react";
import { Button } from "@/components/Button";

// Asks before a bulk status change on the People list (#129), and says what it will do. Presentational:
// the caller runs the action and passes back busy.
export type MarkTo = "new" | "joined" | "later";

const ACTIONS: Record<
  MarkTo,
  { icon: LucideIcon; button: string; title: (n: string) => string; body: string }
> = {
  new: {
    icon: CircleDashed,
    button: "Mark to contact",
    title: (n) => `Move ${n} back to To contact?`,
    body: "They return to the To contact list, and their contact date is cleared. Nothing is sent to them.",
  },
  joined: {
    icon: UserCheck,
    button: "Mark joined",
    title: (n) => `Mark ${n} as joined?`,
    body: "They move to the Joined list and stay on the idea. Nothing is sent to them.",
  },
  later: {
    icon: PauseCircle,
    button: "Mark not now",
    title: (n) => `Mark ${n} as not now?`,
    body: "They move to the Not now list. They can be moved back to To contact at any time. Nothing is sent to them.",
  },
};

export function ConfirmMarkDialog({
  to,
  count,
  busy,
  onConfirm,
  onCancel,
}: {
  to: MarkTo | null;
  count: number;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const action = to ? ACTIONS[to] : null;
  const who = count === 1 ? "1 person" : `${count} people`;
  const Icon = action?.icon;
  return (
    <Dialog.Root open={to !== null} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup className="sheet flex flex-col gap-4 bg-surface p-card text-ink">
          {action && (
            <>
              <Dialog.Title className="heading text-3xl">{action.title(who)}</Dialog.Title>
              <Dialog.Description className="max-w-prose">{action.body}</Dialog.Description>
              <div className="flex flex-wrap justify-end gap-2">
                <Dialog.Close render={<Button variant="plain" disabled={busy} />}>Cancel</Dialog.Close>
                <Button variant="primary" disabled={busy} onClick={onConfirm}>
                  {Icon && <Icon aria-hidden className="size-4" />}
                  {action.button}
                </Button>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
