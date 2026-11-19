// The last lines of every email a student gets (#211): why it was sent, and the way to
// change which emails come. One definition, so the link is the same everywhere.

export const settingsLine = (siteUrl: string): string =>
  `Change which emails you get: ${siteUrl}/me/notifications`;

export const followerFooter = (siteUrl: string): string[] => [
  "You get this email because you follow this idea.",
  settingsLine(siteUrl),
];

// The digest's footer carries the signed unsubscribe link (#212), then the settings line.
export const digestFooter = (siteUrl: string, unsubscribeLink: string): string[] => [
  "You get this weekly digest because you follow these ideas.",
  `Stop the weekly digest: ${unsubscribeLink}`,
  settingsLine(siteUrl),
];

export const ownPostFooter = (siteUrl: string): string[] => [
  "You get this email because you posted this idea.",
  settingsLine(siteUrl),
];
