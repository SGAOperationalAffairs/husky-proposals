// The last lines of every email a student gets (#211): why it was sent, and the way to
// change which emails come. One definition, so the link is the same everywhere.

export const settingsLine = (siteUrl: string): string =>
  `Change which emails you get: ${siteUrl}/me/notifications`;

export const followerFooter = (siteUrl: string): string[] => [
  "You get this email because you follow this idea.",
  settingsLine(siteUrl),
];

export const ownPostFooter = (siteUrl: string): string[] => [
  "You get this email because you posted this idea.",
  settingsLine(siteUrl),
];
