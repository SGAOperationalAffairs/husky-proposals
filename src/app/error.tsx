"use client";

import { useEffect } from "react";
import { Button } from "@/components/Button";
import { reportError } from "./_errors/reports";

// The root error boundary (#191). Every environment gets this plain screen, with no detail.
// On dev and preview the floater (mounted in the layout, so it survives this screen) shows
// the error and its digest; reportError does nothing in production.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportError("route", error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12">
      <h1 className="heading text-6xl">Something went wrong on this page.</h1>
      <div>
        <Button variant="primary" onClick={retry}>
          Try again
        </Button>
      </div>
    </main>
  );
}
