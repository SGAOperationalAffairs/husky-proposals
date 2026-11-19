"use client";

import { EmailSetting } from "@/components/EmailSetting";
import { EMAIL_SETTINGS, SETTABLE_EMAIL_TYPES } from "@/core/emailSettings";
import { useEmailSettings, type EmailSettingValues } from "./useEmailSettings";

// The notification settings page body (#211). The heading is the page's, because it
// renders only after the sign-in check (#158). `stopped` is a bounce, complaint, or
// deactivation: it stops every email whatever the rows say, so the page says so, and the
// rows still work in case email ever starts again. `sample` is a run with no database
// (local and browser tests only): the rows show but cannot save.
type Props = { settings: EmailSettingValues; stopped: boolean; sample: boolean };

export function EmailSettingsView({ settings: initial, stopped, sample }: Props) {
  const { settings, busy, change } = useEmailSettings(initial);
  return (
    <div className="flex max-w-prose flex-col gap-6">
      <p>Choose which emails we send you. Each one is on until you turn it off.</p>
      {stopped && (
        <p className="border-t accent-rule pt-3">
          Email to you is stopped because a message bounced or was marked as spam. Nothing below will send
          while it is stopped.
        </p>
      )}
      <div>
        {SETTABLE_EMAIL_TYPES.map((type) => (
          <EmailSetting
            key={type}
            label={EMAIL_SETTINGS[type].label}
            hint={EMAIL_SETTINGS[type].hint}
            checked={settings[type]}
            busy={busy === type}
            disabled={sample}
            onChange={(on) => void change(type, on)}
          />
        ))}
      </div>
      {sample && <p className="text-muted">Settings save once the site has a database.</p>}
      <p className="text-muted">
        You can always see where your posts stand on My ideas. If an email to you bounces or is marked as
        spam, we stop all email to you.
      </p>
    </div>
  );
}
