"use client";

import Form from "next/form";
import { useState } from "react";
import { Button } from "./Button";
import { SelectField, TextField } from "./Field";

// Search, status, and sort for the ideas list (#61). A GET form, so filters
// live in the URL and work without JavaScript. With it, a dropdown applies as
// soon as it changes; search applies on Enter or the Search button.
type Option = { value: string; label: string };

type Props = {
  // Where the form goes: the list it filters.
  action: string;
  q?: string;
  board?: string;
  status?: string;
  sort: string;
  // No statuses means the list has no status filter (In progress, #63).
  statuses?: Option[];
  sorts: Option[];
};

// The page re-renders in place on each change (no reload), so the form stays
// mounted to keep focus where the student left it, and the page does not jump
// to the top. Fields hold their own values and follow the URL when it changes
// some other way, such as Back or a board chip (#61).
export function IdeaFilters({ action, q, board, status, sort, statuses, sorts }: Props) {
  const [fields, setFields] = useState({ q: q ?? "", status: status ?? "", sort });
  const [shown, setShown] = useState({ q, status, sort });
  if (shown.q !== q || shown.status !== status || shown.sort !== sort) {
    setShown({ q, status, sort });
    setFields({ q: q ?? "", status: status ?? "", sort });
  }
  const pick = (name: "status" | "sort") => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFields({ ...fields, [name]: e.target.value });
    e.currentTarget.form?.requestSubmit();
  };
  return (
    <Form action={action} scroll={false} className="grid grid-cols-2 items-end gap-3 @3xl:grid-cols-4">
      {board && <input type="hidden" name="board" value={board} />}
      {/* The Search button sits flush against the field, so they read as one bar. */}
      <div className="col-span-2 flex items-end">
        <div className="min-w-0 flex-1">
          <TextField
            label="Search"
            type="search"
            name="q"
            onPage
            value={fields.q}
            onChange={(e) => setFields({ ...fields, q: e.target.value })}
            placeholder="Search ideas"
          />
        </div>
        <Button type="submit" variant="primary">
          Search
        </Button>
      </div>
      {statuses && (
        <SelectField label="Status" name="status" value={fields.status} onChange={pick("status")}>
          <option value="">All</option>
          {statuses.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      )}
      <SelectField label="Sort by" name="sort" value={fields.sort} onChange={pick("sort")}>
        {sorts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectField>
    </Form>
  );
}
