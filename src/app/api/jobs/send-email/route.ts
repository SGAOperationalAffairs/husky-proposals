import { db } from "@/db/runtime";
import { mailerFromEnv } from "@/email/mailer";
import { env } from "@/env";
import { handleJobRequest } from "@/jobs/jobRequest";
import { runSendEmailJob } from "@/jobs/sendEmailJob";

// A drain of the email outbox, called every 15 minutes by .github/workflows/jobs.yml (#210).
// 50 paced sends take 30 to 40 seconds, so the function gets a minute.
export const maxDuration = 60;

// No same-origin check here, unlike a server action: GitHub Actions is not our origin, so
// the bearer secret is the guard, and nothing is read or written before it is checked (#210).
// A POST handler is never cached.
export async function POST(request: Request) {
  const { status, body } = await handleJobRequest({
    authorization: request.headers.get("authorization"),
    secret: env().JOBS_SECRET,
    run: async () => {
      const { SITE_URL } = env();
      // Required on dev and production; only a local run can reach this.
      if (!SITE_URL) throw new Error("SITE_URL is not set");
      return runSendEmailJob({
        db: db(),
        mailer: mailerFromEnv(env()),
        now: new Date(),
        siteUrl: SITE_URL,
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      });
    },
  });
  return Response.json(body, { status });
}
