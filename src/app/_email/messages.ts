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
