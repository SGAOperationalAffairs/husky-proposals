"use client";

import { Link as LinkIcon } from "lucide-react";
import type { BoardCode } from "@/core/boards";
import { Button } from "./Button";
import { useToast } from "./Toast";

// The copy-link share (#62): copies a link and says so in a toast, which
// screen readers hear without losing their place. `text` is what to copy; by
// default, this page's address.
export function CopyLink({ text, board }: { text?: string; board?: BoardCode } = {}) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text ?? window.location.href);
      toast({ title: "Link copied.", board });
    } catch {
      toast({ title: "Could not copy.", description: "Copy the address from your browser instead.", board });
    }
  };
  return (
    <Button variant="primary" onClick={copy}>
      <LinkIcon aria-hidden className="size-4" />
      Copy link
    </Button>
  );
}
