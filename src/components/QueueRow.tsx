import { StatusLabel, type IdeaStatus } from "./StatusLabel";

// A row in the SGA queue (prototype .row): rank, idea, supporters, willing
// to help, age, status. On narrow screens it stacks.
export type QueueRowData = {
  rank: number;
  number: number;
  title: string;
  boardTag: string;
  supportCount: number;
  willingCount: number;
  ageDays: number;
  status: IdeaStatus;
  stale?: boolean;
};

export function QueueHeader() {
  return (
    <div className="hidden gap-3 border-b border-line bg-bg px-3.5 py-2 text-xs text-muted @2xl:grid @2xl:queue-cols-wide">
      <span>Rank</span>
      <span>Idea</span>
      <span>Supporters</span>
      <span>Willing to help</span>
      <span>Age</span>
      <span>Status</span>
    </div>
  );
}

export function QueueRow(row: QueueRowData) {
  return (
    <div className="grid queue-cols items-center gap-x-3 gap-y-1.5 border-b border-line px-3.5 py-3 last:border-b-0 hover:bg-accent-soft @2xl:queue-cols-wide">
      <span className="heading text-lg">{row.rank}</span>
      <span className="min-w-0">
        <b className="mr-1.5">{row.title}</b>
        <span className="text-sm text-muted">
          Proposal {row.number}, {row.boardTag}
        </span>
      </span>
      <span className="col-start-2 text-sm @2xl:col-start-auto">{row.supportCount} supporters</span>
      <span className="col-start-2 text-sm @2xl:col-start-auto">{row.willingCount} willing</span>
      <span className="col-start-2 text-sm text-muted @2xl:col-start-auto">{row.ageDays} days</span>
      <span className="col-start-2 flex flex-wrap items-center gap-1.5 @2xl:col-start-auto">
        <StatusLabel status={row.status} />
        {row.stale && <span className="text-xs font-semibold text-accent-text">Needs an update</span>}
      </span>
    </div>
  );
}
