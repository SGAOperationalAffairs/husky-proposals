import { X } from "lucide-react";
import { ERROR_SOURCE_LABELS, type ErrorEntry } from "@/core/errorReport";

type Props = {
  entries: readonly ErrorEntry[];
  // The newest report's announcement. A repeat changes it too, so it is announced again.
  latest: string;
  onDismiss: (key: string) => void;
  onClearAll: () => void;
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// The on-screen error panel for dev and preview (#191). Dark on the page, so it reads as a
// tool and not as content. Presentational: the store and the gate live in src/app/_errors/.
export function ErrorFloater({ entries, latest, onDismiss, onClearAll }: Props) {
  if (entries.length === 0) return null;
  return (
    <section
      aria-label="Errors on this page"
      className="fixed inset-x-0 bottom-0 z-40 border-t accent-rule bg-ink text-bg"
    >
      {/* The live region is separate from the list, so the whole list is never re-announced. */}
      <p role="alert" className="sr-only">
        {latest}
      </p>
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="heading text-2xl">
              Errors on this page <span className="tabular-nums">{entries.length}</span>
            </h2>
            <p className="text-sm">Shown on dev and preview only.</p>
          </div>
          <button type="button" onClick={onClearAll} className="text-sm underline underline-offset-4">
            Clear all
          </button>
        </div>
        <ul className="mt-2 max-h-80 overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.key} className="flex items-start gap-3 border-t border-current py-2">
              <time dateTime={entry.lastAt} className="text-sm tabular-nums">
                {time(entry.lastAt)}
              </time>
              <span className="rounded-chip bordered px-1.5 text-xs font-semibold">
                {ERROR_SOURCE_LABELS[entry.source]}
              </span>
              <div className="min-w-0 flex-1">
                {entry.count > 1 && <span className="text-sm font-semibold">{entry.count} times </span>}
                <span className="text-sm break-words whitespace-pre-wrap">{entry.message}</span>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(entry.key)}
                aria-label="Dismiss this error"
                title="Dismiss"
              >
                <X aria-hidden size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
