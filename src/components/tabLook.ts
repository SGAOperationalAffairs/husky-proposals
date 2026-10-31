// Plain module, not "use client": SiteHeader renders on the server and calls it.
// The tab look, shared with SiteHeader's page links (#63), which are links in a
// nav rather than a tablist because each goes to its own page.
export const tabLook = (active: boolean) =>
  `-mb-px inline-flex items-center gap-2 border-b-3 px-4 py-3 whitespace-nowrap ${
    active ? "border-accent font-semibold text-accent-text" : "border-transparent font-medium"
  }`;
