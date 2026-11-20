import type { SetEmailSettingResult } from "./setEmailSetting";

// The words for a notification setting that did not save (#211). Every code the action
// can return is an expected result, so it gets plain copy, not a thrown error.
type Failure = Extract<SetEmailSettingResult, { ok: false }>["error"]["code"];
export type EmailSettingCode = Failure | "cross_origin" | "signed_out" | "unexpected";

export const TRY_AGAIN_TEXT = "That didn't go through. Try again.";

// A Record, so a new code fails to compile until it has copy.
const TEXT: Record<EmailSettingCode, string> = {
  invalid: TRY_AGAIN_TEXT,
  cross_origin: TRY_AGAIN_TEXT,
  signed_out: "You're signed out. Sign in again to change this.",
  // A throw on dev or preview (#191); the floater shows the detail.
  unexpected: TRY_AGAIN_TEXT,
};

export const EMAIL_SETTING_CODES = Object.keys(TEXT) as EmailSettingCode[];

export const emailSettingMessage = (code: EmailSettingCode): string => TEXT[code];

// The words on /unsubscribe, the page the digest's link opens (#212). It names only the
// weekly digest, the one email that carries the link.
export const UNSUBSCRIBE_COPY = {
  heading: "Weekly digest",
  ask: "Stop getting the weekly digest of ideas you follow? You can turn it back on any time in your notification settings.",
  stop: "Stop the weekly digest",
  stopping: "Stopping...",
  otherEmails: "Change other emails",
  doneTitle: "The weekly digest is off.",
  doneBefore: "You will not get it again unless you turn it back on in your ",
  doneLink: "notification settings",
  doneAfter: ".",
  invalid:
    "This link does not work. It may have been cut off when it was copied. To stop the weekly digest, sign in and open your notification settings.",
  openSettings: "Open notification settings",
  preview: "This preview has no database, so nothing is saved.",
} as const;

export const UNSUBSCRIBE_FAILED_TEXT = "That did not work. Try again in a minute.";

// A link that stopped verifying between the page and the tap reads the same as a bad one.
export type UnsubscribeCode = "invalid" | "cross_origin" | "unexpected";

export const unsubscribeFailureText = (code: UnsubscribeCode): string =>
  code === "invalid" ? UNSUBSCRIBE_COPY.invalid : UNSUBSCRIBE_FAILED_TEXT;
