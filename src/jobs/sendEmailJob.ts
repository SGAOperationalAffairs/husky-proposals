import { drainOutbox } from "@/db/outbox";
import type { Mailer } from "@/email/sendEmail";

// 50 sends at one every 600 ms is about 1.6 a second, under Resend's default per-second
// limit, and takes 30 to 40 seconds: inside the route's 60-second budget and well inside the
// claim's 10-minute lock (#210). One batch per run: the schedule is the loop.
export const SEND_BATCH = 50;
export const SEND_INTERVAL_MS = 600;

export function runSendEmailJob({
  db,
  mailer,
  now,
  siteUrl,
  sleep,
}: {
  db: Parameters<typeof drainOutbox>[0];
  mailer: Mailer;
  now: Date;
  siteUrl: string;
  sleep: (ms: number) => Promise<void>;
}) {
  return drainOutbox(db, mailer, now, {
    siteUrl,
    limit: SEND_BATCH,
    pace: () => sleep(SEND_INTERVAL_MS),
  });
}
