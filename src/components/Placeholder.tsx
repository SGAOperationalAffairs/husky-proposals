// Loading placeholders (#73), shaped like what is coming so nothing jumps when
// it arrives. Each bar is a line of transparent text in the real element's own
// classes, so it takes that element's exact line height and font size. Flat,
// with no shimmer. The region says it is busy; the shapes are hidden from
// screen readers, who hear one short line instead.

const BOARD_CHIPS = ["All boards", "Dining", "Planning", "Services", "Green", "Sustainability"];

export function WallPlaceholder() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <p className="sr-only">Loading ideas</p>
      <div aria-hidden className="placeholder flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          {BOARD_CHIPS.map((chip) => (
            <span key={chip} className="placeholder-chip inline-flex px-3 py-1.5 text-sm font-bold">
              <Bar>{chip}</Bar>
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 items-end gap-3 @3xl:grid-cols-4">
          <Field className="col-span-2" />
          <Field />
          <Field />
        </div>
        <p className="text-sm">
          <Bar>00 ideas</Bar>
        </p>
        <div className="card-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <PosterShape key={n} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function IdeaPlaceholder() {
  return (
    <div aria-busy="true">
      <p className="sr-only">Loading the idea</p>
      <div aria-hidden className="placeholder grid items-start gap-6 @3xl:grid-cols-5 @3xl:idea-rows">
        <div className="placeholder-poster flex flex-col gap-4 @3xl:col-span-3">
          <p className="text-sm font-bold">
            <Bar>Campus Services Committee 103</Bar>
          </p>
          <p className="heading text-5xl text-balance @3xl:text-7xl">
            <Bar>An idea for campus, in a few words</Bar>
          </p>
          <p className="max-w-prose">
            <Bar>
              A short description of the idea, about as long as most of them are, so it wraps onto a second
              line.
            </Bar>
          </p>
          <p className="heading text-8xl">
            <Bar>000</Bar>
          </p>
          <div className="grid grid-cols-1 gap-2 @2xs:grid-cols-2">
            <span className="placeholder-chip px-3 py-2 font-bold">
              <Bar>Support</Bar>
            </span>
            <span className="placeholder-chip px-3 py-2 font-bold">
              <Bar>I&rsquo;ll participate</Bar>
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-6 @3xl:col-span-2 @3xl:row-span-3">
          {["Where it stands", "000 supporters", "Share this idea"].map((title) => (
            <div key={title} className="flex flex-col gap-3 bordered bg-surface p-card">
              <p className="heading text-3xl">
                <Bar>{title}</Bar>
              </p>
              <p>
                <Bar>A line or two about it, while the rest of the page loads.</Bar>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// A poster on the wall, part for part (IdeaCard).
function PosterShape() {
  return (
    <div className="placeholder-poster card-stack @container flex flex-col">
      <p className="text-xs font-bold">
        <Bar>Board 103</Bar>
      </p>
      <p className="poster-title poster-title-lines heading">
        <Bar>An idea headline, long enough for three lines</Bar>
      </p>
      <p className="poster-desc text-sm">
        <Bar>A short description of the idea that runs onto a second line of text.</Bar>
      </p>
      <div className="card-stack mt-auto flex flex-col pt-1">
        <p className="flex items-end gap-x-2.5">
          <span className="poster-number heading">
            <Bar>000</Bar>
          </span>
          <span className="pb-1 text-sm leading-tight font-semibold">
            <Bar>students want this</Bar>
            <br />
            <Bar>00 will help</Bar>
          </span>
        </p>
        <span className="placeholder-text block h-5.5 w-16" />
      </div>
    </div>
  );
}

function Field({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-sm font-semibold">
        <Bar>Search</Bar>
      </span>
      <span className="placeholder-chip block px-3 py-2">&nbsp;</span>
    </div>
  );
}

function Bar({ children }: { children: React.ReactNode }) {
  return <span className="placeholder-text">{children}</span>;
}
