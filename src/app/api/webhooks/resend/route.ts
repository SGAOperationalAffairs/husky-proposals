import { emailEventStore } from "@/db/emailEventStore";
import { db } from "@/db/runtime";
import { env } from "@/env";
import { handleResendWebhook } from "@/email/resendWebhook";

// Resend's bounce and complaint events (#209). This is the one write that does not come
// from our own origin, so there is no same-origin check: the Svix signature over the raw
// body is its guard. The body is read as text first, because the signature covers its bytes.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const client = db();
  const { status, body } = await handleResendWebhook({
    rawBody,
    headers: {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    secret: env().RESEND_WEBHOOK_SECRET,
    now: new Date(),
    store: emailEventStore(client, (work) => client.$transaction(work)),
  });
  return Response.json(body, { status });
}
