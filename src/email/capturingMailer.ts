import type { EmailMessage, Mailer } from "./sendEmail";

export type CapturingMailer = Mailer & {
  readonly sent: readonly EmailMessage[];
  last(): EmailMessage | undefined;
  clear(): void;
  // The next send rejects with this error and records nothing, for the outbox worker's retry tests (E9).
  failNext(error: Error): void;
};

// Tests read what would have been sent instead of reaching a provider (#43).
export function createCapturingMailer(): CapturingMailer {
  const sent: EmailMessage[] = [];
  let counter = 0;
  let failure: Error | undefined;
  return {
    sent,
    async send(message) {
      if (failure) {
        const error = failure;
        failure = undefined;
        throw error;
      }
      sent.push(message);
      counter += 1;
      return { providerMessageId: `captured-${counter}` };
    },
    last: () => sent.at(-1),
    clear() {
      sent.length = 0;
    },
    failNext(error) {
      failure = error;
    },
  };
}
