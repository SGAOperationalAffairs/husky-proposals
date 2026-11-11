import { env } from "@/env";
import { showsErrors } from "@/core/errorReport";

// Whether this deployment shows errors on screen (#191). The only server-side read of
// the gate, so production never mounts the floater or returns an error's detail.
export function errorsShown(): boolean {
  return showsErrors(env().APP_ENV);
}
