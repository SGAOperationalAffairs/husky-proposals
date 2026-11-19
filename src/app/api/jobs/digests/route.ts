import { usesSampleIdeas } from "@/app/_ideas/source";
import { queueDigests } from "@/db/digest";
import { db } from "@/db/runtime";
import { env } from "@/env";
import { handleJobRequest } from "@/jobs/jobRequest";

// The weekly digest's daily pass, called once a day by .github/workflows/digests.yml (#212).
// It only queues digest rows for today's weekday cohort; the send route's drain (#210)
// sends them. About 215 of 1,500 followers a day, so one function call is plenty.
export const maxDuration = 60;

// Same guard as every scheduled route (#210): the bearer secret, and nothing is read or
// written before it is checked. A missing setting is thrown, not answered with a custom
// status: the route answers 500 and the workflow run fails, as the send route does when
// SITE_URL is missing. A POST handler is never cached.
export async function POST(request: Request) {
  const { status, body } = await handleJobRequest({
    authorization: request.headers.get("authorization"),
    secret: env().JOBS_SECRET,
    run: async () => {
      const settings = env();
      // Optional in the schema, but required wherever email can be sent, and no digest may
      // go out without a link that signs.
      if (!settings.EMAIL_LINK_SECRET) throw new Error("EMAIL_LINK_SECRET is not set");
      if (usesSampleIdeas(settings)) throw new Error("There is no database to read followers from");
      const linkSecret = settings.EMAIL_LINK_SECRET;
      // One transaction, so a failed pass leaves no rows and no moved `lastDigestAt`.
      return db().$transaction((tx) => queueDigests(tx, new Date(), { linkSecret }), {
        timeout: 30_000,
        maxWait: 10_000,
      });
    },
  });
  return Response.json(body, { status });
}
