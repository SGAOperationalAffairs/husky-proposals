"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/Button";

// Opens the browser's print dialog, which can also save a PDF (#64).
export function PrintButton() {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      <Printer aria-hidden className="size-4" />
      Print flyer
    </Button>
  );
}
