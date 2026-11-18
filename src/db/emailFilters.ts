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

// The same rule as acceptsEmail, for a user read with emailPermissionSelect.
export function userAcceptsEmail(user: EmailPermission, type: EmailType): boolean {
  return user.emailStoppedAt === null && !user.emailOptOuts.some((optOut) => optOut.type === type);
}
