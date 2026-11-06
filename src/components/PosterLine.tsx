// Who posted, for a leader (#59). One component, so the decision drawer and the idea
// page's leader panel say the same thing. The data carries a name only for the kinds
// that may show one; "anonymous_hidden" has no name or email key at all.
export type PosterData =
  | { kind: "named"; name: string; email: string }
  | { kind: "anonymous_visible"; name: string; email: string }
  | { kind: "anonymous_hidden" }
  | { kind: "deleted" };

export function PosterLine({ poster }: { poster: PosterData }) {
  switch (poster.kind) {
    case "named":
      return (
        <p>
          Posted by {poster.name}, {poster.email}
        </p>
      );
    case "anonymous_visible":
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="bordered px-2 py-0.5 text-xs font-bold">Anonymous to students</span>
          <p>
            Posted by {poster.name}, {poster.email}. Only this board&rsquo;s reviewer and the VP of Campus
            Affairs see this name.
          </p>
        </div>
      );
    case "anonymous_hidden":
      return <p>Anonymous to students. You can&rsquo;t see who posted it.</p>;
    case "deleted":
      return <p>Posted by a student whose account was deleted.</p>;
  }
}
