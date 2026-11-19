export type FakeResendRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
};

type FakeReply = { status: number; body?: unknown; headers?: Record<string, string> };

export type FakeResendFetch = {
  fetch: typeof globalThis.fetch;
  readonly requests: readonly FakeResendRequest[];
  // The next request gets this reply instead of the default 200 with an id.
  respondNext(reply: FakeReply): void;
  // The next request rejects with this error, as a network failure or timeout does.
  failNext(error: Error): void;
};

// The fake provider for the Resend mailer's tests (#209): a fetch-shaped function that
// records what was sent and answers from a script. No test reaches the real service.
export function createFakeResendFetch(): FakeResendFetch {
  const requests: FakeResendRequest[] = [];
  const replies: Array<FakeReply | Error> = [];
  let counter = 0;

  const fakeFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    requests.push({
      method: init?.method ?? "GET",
      url: String(input),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
    });
    const next = replies.shift();
    if (next instanceof Error) throw next;
    if (next) return Response.json(next.body ?? {}, { status: next.status, headers: next.headers });
    counter += 1;
    return Response.json({ id: `fake-resend-${counter}` }, { status: 200 });
  };

  return {
    fetch: fakeFetch as typeof globalThis.fetch,
    requests,
    respondNext: (reply) => void replies.push(reply),
    failNext: (error) => void replies.push(error),
  };
}
