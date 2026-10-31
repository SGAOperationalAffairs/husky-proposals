"use client";

import { useState, type FormEvent } from "react";
import { Button } from "./Button";
import { SelectField, TextField } from "./Field";

// Search, status, and sort for the student lists (#61). A GET form, so without
// JavaScript it still works as a plain page load. With it, changes go to
// onChange and the wall filters in place: a dropdown applies as soon as it
// changes, search on Enter or the Search button.
type Option = { value: string; label: string };
type Change = { q?: string; status?: string; sort?: string };

type Props = {
  // Where the form goes without JavaScript: the list it filters.
  action: string;
  q?: string;
  board?: string;
  status?: string;
  sort: string;
  // No statuses means the list has no status filter (In progress, #63).
  statuses?: Option[];
  sorts: Option[];
  onChange: (change: Change) => void;
};

export function IdeaFilters({ action, q, board, status, sort, statuses, sorts, onChange }: Props) {
  // The search box holds what the student is typing until they search, and
  // follows the URL when it changes some other way, such as Back.
  const [text, setText] = useState(q ?? "");
  const [shownQ, setShownQ] = useState(q);
  if (shownQ !== q) {
    setShownQ(q);
    setText(q ?? "");
  }
  const search = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onChange({ q: text });
  };
  return (
    <form action={action} onSubmit={search} className="grid grid-cols-2 items-end gap-3 @3xl:grid-cols-4">
      {board && <input type="hidden" name="board" value={board} />}
      {/* The Search button sits flush against the field, so they read as one bar. */}
      <div className="col-span-2 flex items-end">
        <div className="min-w-0 flex-1">
          <TextField
            label="Search"
            type="search"
            name="q"
            onPage
            joinedEnd
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search ideas"
          />
        </div>
        <Button type="submit" variant="primary" outlined>
          Search
        </Button>
      </div>
      {statuses && (
        <SelectField
          label="Status"
          name="status"
          value={status ?? ""}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          <option value="">All</option>
          {statuses.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      )}
      <SelectField
        label="Sort by"
        name="sort"
        value={sort}
        onChange={(e) => onChange({ sort: e.target.value })}
      >
        {sorts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectField>
    </form>
  );
}
