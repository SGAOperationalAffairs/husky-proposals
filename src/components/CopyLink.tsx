"use client";

import { Check, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "./Button";

// The copy-link share (#62): copies this page's address and says so in words,
// which screen readers hear through the status region.
export function CopyLink() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setState("copied");
    } catch {
      setState("failed");
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" onClick={copy}>
        {state === "copied" ? (
          <Check aria-hidden className="size-4" />
        ) : (
          <LinkIcon aria-hidden className="size-4" />
        )}
        Copy link
      </Button>
      <span role="status" className="text-sm font-semibold">
        {state === "copied" && "Link copied."}
        {state === "failed" && "Could not copy. Copy the address from your browser instead."}
      </span>
    </div>
  );
}
