"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "./Button";
import { SelectField, TextField } from "./Field";

// Search, board chips, status, and sort for the student lists (#61). A GET form,
// so without JavaScript it still works as a plain page load. With it, changes go
// to onChange and the wall filters in place: a dropdown applies as soon as it
// changes, search on Enter or the Search button.
//
// Layout (#61): the search bar, status, and sort share one row. On wide screens
// the search takes the free space and the dropdowns keep fixed widths; the board
// chips sit under the row. A phone stacks the search full width, puts the dropdowns
// side by side, and the chips below.
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
  // The board chips, shown right under the search bar (#61): the list passes
  // them in, so the form's layout and the chips' own links stay in their files.
  boards?: ReactNode;
  onChange: (change: Change) => void;
};

export function IdeaFilters({ action, q, board, status, sort, statuses, sorts, boards, onChange }: Props) {
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
    <form
      action={action}
      onSubmit={search}
      className="grid grid-cols-2 items-end gap-3 @3xl:flex @3xl:flex-wrap"
    >
      {board && <input type="hidden" name="board" value={board} />}
      {/* The Search button sits flush against the field, so they read as one bar. */}
      <div className="col-span-2 flex items-end @3xl:flex-1">
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
      {/* The dropdowns sit on the page color, like the search field, not in white
          boxes (#61). Fixed widths beside the search on wide screens. */}
      {statuses && (
        <div className="min-w-0 @3xl:w-44">
          <SelectField
            label="Status"
            name="status"
            onPage
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
        </div>
      )}
      <div className="min-w-0 @3xl:w-44">
        <SelectField
          label="Sort by"
          name="sort"
          onPage
          value={sort}
          onChange={(e) => onChange({ sort: e.target.value })}
        >
          {sorts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      </div>
      {boards && <div className="col-span-2 @3xl:basis-full">{boards}</div>}
    </form>
  );
}
