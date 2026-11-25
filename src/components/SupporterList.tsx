// Who supported an idea, for the leader panel (#100). Presentational and server-safe.
// Emails are plain text, not mailto links: supporters never offered to be contacted.
// "I'll participate" and the People list are for that.
type Supporter = { name: string; email: string };

// Past this many, the rest sit behind a native <details>, so it needs no JavaScript.
const SHOWN = 10;

function Rows({ supporters }: { supporters: Supporter[] }) {
  return (
    <ul className="flex flex-col text-sm">
      {supporters.map(({ name, email }) => (
        <li key={email} className="border-b border-line py-1.5">
          {name}, {email}
        </li>
      ))}
    </ul>
  );
}

export function SupporterList({ supporters }: { supporters: Supporter[] }) {
  const count = supporters.length;
  const first = supporters.slice(0, SHOWN);
  const rest = supporters.slice(SHOWN);
  return (
    <div className="flex flex-col gap-2">
      <h3 className="heading text-2xl">Who supported</h3>
      {count === 0 ? (
        <p className="text-sm text-muted">No one has supported this idea yet.</p>
      ) : (
        <>
          <p className="text-sm text-muted">
            {count === 1 ? "1 student" : `${count} students`}. Only SGA&apos;s Executive Board and this
            board&apos;s chair or director see these names.
          </p>
          <Rows supporters={first} />
          {rest.length > 0 && (
            <details>
              <summary className="text-sm font-medium">Show all {count}</summary>
              <Rows supporters={rest} />
            </details>
          )}
        </>
      )}
    </div>
  );
}
