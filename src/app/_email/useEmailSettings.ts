"use client";

import { useState } from "react";
import { reportActionOutcome, reportError } from "@/app/_errors/reports";
import { useToast } from "@/components/Toast";
import { EMAIL_SETTINGS, type SettableEmailType } from "@/core/emailSettings";
import { setEmailSettingAction } from "./actions";
import { emailSettingMessage, TRY_AGAIN_TEXT, type EmailSettingCode } from "./messages";

// The one hook for the notification settings page (#211): holds the four states, shows a
// change at once, saves it, and toasts the result. A failure puts the checkbox back. It
// never retries. Only the tapped row is busy; the others stay usable.
export type EmailSettingValues = Record<SettableEmailType, boolean>;

type Outcome = { ok: true } | { ok: false; error: { code: EmailSettingCode; report?: { message: string } } };

export function useEmailSettings(initial: EmailSettingValues) {
  const toast = useToast();
  const [settings, setSettings] = useState<EmailSettingValues>(initial);
  const [busy, setBusy] = useState<SettableEmailType | null>(null);

  async function change(type: SettableEmailType, on: boolean): Promise<boolean> {
    const before = settings[type];
    setSettings((current) => ({ ...current, [type]: on }));
    setBusy(type);
    const revert = (title: string) => {
      setSettings((current) => ({ ...current, [type]: before }));
      toast({ title });
      return false;
    };
    try {
      let outcome: Outcome;
      try {
        outcome = await setEmailSettingAction({ type, on });
      } catch (thrown) {
        // Production rethrows a failed action (#191). Report it and put the box back,
        // instead of leaving an unhandled rejection and a box that looks saved.
        reportError("action", thrown);
        return revert(TRY_AGAIN_TEXT);
      }
      if (!outcome.ok) {
        reportActionOutcome(outcome);
        return revert(emailSettingMessage(outcome.error.code));
      }
      toast({ title: `${EMAIL_SETTINGS[type].label} ${on ? "on" : "off"}` });
      return true;
    } finally {
      setBusy(null);
    }
  }

  return { settings, busy, change };
}
