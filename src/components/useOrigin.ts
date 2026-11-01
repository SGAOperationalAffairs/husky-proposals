"use client";

import { useSyncExternalStore } from "react";

// The site's address as the browser sees it (localhost, a preview, or
// production), so shared links and QR codes match the site they came from
// (#64). Null on the server and during hydration; callers keep their space.
const noSubscribe = () => () => {};

export function useOrigin() {
  return useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => null,
  );
}
