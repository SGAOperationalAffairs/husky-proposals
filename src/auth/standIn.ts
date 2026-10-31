// Invented test users for the development sign-in stand-in (#45). Every body
// is built in SGAuth's session shape so it passes through the same contract
// as a real response. Emails use example.com, a reserved domain, so none can
// belong to a real student.
export const STAND_IN_COOKIE = "hp-stand-in-user";

export const STAND_IN_USERS = [
  {
    slug: "student",
    id: "00000000-0000-4000-8000-000000000001",
    name: "Jordan Lee",
    email: "jordan.lee@example.com",
    description: "Student, no SGA position",
    positions: [],
  },
  {
    slug: "dab-member",
    id: "00000000-0000-4000-8000-000000000002",
    name: "Riley Chen",
    email: "riley.chen@example.com",
    description: "Dining Advisory Board member",
    positions: [{ key: "dining-advisory-board-member", name: "Dining Advisory Board Member" }],
  },
  {
    slug: "dab-chair",
    id: "00000000-0000-4000-8000-000000000003",
    name: "Sam Rivera",
    email: "sam.rivera@example.com",
    description: "Chair of the Dining Advisory Board",
    positions: [{ key: "chair-of-dining-advisory-board", name: "Chair of the Dining Advisory Board" }],
  },
  {
    slug: "csc-director",
    id: "00000000-0000-4000-8000-000000000004",
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    description: "Director of Campus Services",
    positions: [{ key: "director-of-campus-services", name: "Director of Campus Services" }],
  },
  {
    slug: "vp",
    id: "00000000-0000-4000-8000-000000000005",
    name: "Taylor Brooks",
    email: "taylor.brooks@example.com",
    description: "VP of Campus Affairs",
    positions: [{ key: "vice-president-of-campus-affairs", name: "Vice President of Campus Affairs" }],
  },
  {
    slug: "other-position",
    id: "00000000-0000-4000-8000-000000000006",
    name: "Casey Park",
    email: "casey.park@example.com",
    description: "An SGA position this app does not use",
    positions: [{ key: "vice-president-of-finance", name: "Vice President of Finance" }],
  },
] as const;

export type StandInSlug = (typeof STAND_IN_USERS)[number]["slug"];

// A tuple, so z.enum can validate a form field against it.
export const STAND_IN_SLUGS = STAND_IN_USERS.map((user) => user.slug) as [StandInSlug, ...StandInSlug[]];

// Returns unknown on purpose: the caller must run it through toSession.
export function standInResponse(slug: string | undefined, now: Date): unknown {
  const user = STAND_IN_USERS.find((candidate) => candidate.slug === slug);
  if (!user) return null;
  const iso = now.toISOString();
  const day = 24 * 60 * 60 * 1000;
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      preferredName: null,
      isAdmin: false,
      isPrimaryAdmin: false,
    },
    // Sorted by key in code-unit order, as SGAuth does.
    positions: [...user.positions].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
    session: {
      id: `stand-in-${user.slug}`,
      expiresAt: new Date(now.getTime() + day).toISOString(),
      absoluteExpiresAt: new Date(now.getTime() + 30 * day).toISOString(),
      createdAt: iso,
    },
  };
}
