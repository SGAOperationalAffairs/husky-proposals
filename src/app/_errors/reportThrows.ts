import { unstable_rethrow } from "next/navigation";
import { normalizeError, type Unexpected } from "@/core/errorReport";
import { errorsShown } from "./errorsShown";

// Wraps a server action so a throw is visible where there is no server log to read (#191).
// On dev and preview the caught throw becomes an `unexpected` result carrying the message,
// because those are production builds and Next hides thrown messages from the browser.
// In production it is rethrown exactly as before, so no detail ever reaches a student.
// Wrap the outer function, so the origin check and withSession sit inside it.
export function reportThrows<A extends unknown[], R>(name: string, action: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R | Unexpected> => {
    try {
      return await action(...args);
    } catch (error) {
      // redirect() and notFound() are thrown on purpose and must still reach Next.
      unstable_rethrow(error);
      // Catching means Next no longer logs it, so log it here.
      console.error(`${name}:`, error);
      if (!errorsShown()) throw error;
      const message = normalizeError(`${name}: ${normalizeError(error)}`);
      return { ok: false, error: { code: "unexpected", report: { message } } };
    }
  };
}
