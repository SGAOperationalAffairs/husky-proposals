import type { EmailType, Prisma } from "@/generated/prisma/client";

// "May we send this type of email to this user" (#211), defined once. A bounce, complaint,
// or deactivation (users.email_stopped_at, #209) stops every type whatever the student
// chose; otherwise a type is on until the student turned it off (email_opt_outs, no row
// means on). The digest (#212) uses acceptsEmail("digest") to pick who gets one.

// For a query: the users who accept `type`.
export function acceptsEmail(type: EmailType) {
  return { emailStoppedAt: null, emailOptOuts: { none: { type } } } satisfies Prisma.UserWhereInput;
}

// For a row already read: the fields userAcceptsEmail needs. A read that cannot filter
// (a to-one relation, or users already fetched for a batch) selects these instead.
export const emailPermissionSelect = {
  emailStoppedAt: true,
  emailOptOuts: { select: { type: true } },
} as const satisfies Prisma.UserSelect;

export type EmailPermission = Prisma.UserGetPayload<{ select: typeof emailPermissionSelect }>;

// The follower email's own rule, on top of acceptsEmail (#257): a follower with no
// preference row is on, otherwise they must not be unsubscribed, bounced, or have turned
// the digest off. Queue time filters with followerPreferenceWhere; the drain re-reads the
// row with emailPreferenceSelect and asks preferenceAllowsFollowerEmail, so one rule decides
// both and someone who opts out after queueing is not emailed.
export const followerPreferenceWhere = {
  OR: [
    { emailPreference: null },
    { emailPreference: { unsubscribedAt: null, bouncedAt: null, digestFrequency: { not: "off" } } },
  ],
} satisfies Prisma.UserWhereInput;

export const emailPreferenceSelect = {
  unsubscribedAt: true,
  bouncedAt: true,
  digestFrequency: true,
} as const satisfies Prisma.EmailPreferenceSelect;

export type EmailPreferenceRow = Prisma.EmailPreferenceGetPayload<{ select: typeof emailPreferenceSelect }>;

// The same rule as followerPreferenceWhere, for a preference read with emailPreferenceSelect.
// Null means no row, which is on.
export function preferenceAllowsFollowerEmail(preference: EmailPreferenceRow | null): boolean {
  if (!preference) return true;
  return (
    preference.unsubscribedAt === null &&
    preference.bouncedAt === null &&
    preference.digestFrequency !== "off"
  );
}

// The same rule as acceptsEmail, for a user read with emailPermissionSelect.
export function userAcceptsEmail(user: EmailPermission, type: EmailType): boolean {
  return user.emailStoppedAt === null && !user.emailOptOuts.some((optOut) => optOut.type === type);
}
