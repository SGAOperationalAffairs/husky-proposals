"use client";

import Form from "next/form";
import { Button } from "./Button";
import { SelectField, TextField } from "./Field";

// Search, status, and sort for the ideas list (#61). A GET form, so filters
// live in the URL and work without JavaScript. With it, a dropdown applies as
// soon as it changes; search applies on Enter or the Search button.
type Option = { value: string; label: string };

type Props = {
  q?: string;
  board?: string;
  status?: string;
  sort: string;
  statuses: Option[];
  sorts: Option[];
};

export function IdeaFilters({ q, board, status, sort, statuses, sorts }: Props) {
  const submit = (e: React.ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();
  return (
    <Form action="/" className="grid grid-cols-2 items-end gap-3 @3xl:grid-cols-4">
      {board && <input type="hidden" name="board" value={board} />}
      <div className="col-span-2 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <TextField label="Search" type="search" name="q" defaultValue={q} placeholder="Search ideas" />
        </div>
        <Button type="submit">Search</Button>
      </div>
      <SelectField label="Status" name="status" defaultValue={status ?? ""} onChange={submit}>
        <option value="">All</option>
        {statuses.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectField>
      <SelectField label="Sort by" name="sort" defaultValue={sort} onChange={submit}>
        {sorts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectField>
    </Form>
  );
}
