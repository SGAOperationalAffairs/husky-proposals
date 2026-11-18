import { z } from "zod";

// The emails a student can turn off (#211), in the order the notification settings page
// shows them. reviewer_reminder is not here: it is a leader's job email, not a preference.
export const SETTABLE_EMAIL_TYPES = ["post_decided", "post_status", "digest", "idea_event"] as const;

export type SettableEmailType = (typeof SETTABLE_EMAIL_TYPES)[number];

export const EMAIL_SETTINGS: Record<SettableEmailType, { label: string; hint: string }> = {
  post_decided: {
    label: "Decisions on my posts",
    hint: "When a post you wrote is approved, not approved, or taken down.",
  },
  post_status: {
    label: "Status changes on my ideas",
    hint: "When a board starts, puts on hold, or delivers an idea you posted.",
  },
  digest: {
    label: "Weekly digest",
    hint: "Once a week, what changed on ideas you follow. Skipped when nothing did.",
  },
  idea_event: {
    label: "Updates on ideas I follow",
    hint: "Each time an idea you follow changes status or gets an update.",
  },
};

export const emailSettingInputSchema = z.object({
  type: z.enum(SETTABLE_EMAIL_TYPES),
  on: z.boolean(),
});

export type EmailSettingInput = z.infer<typeof emailSettingInputSchema>;
