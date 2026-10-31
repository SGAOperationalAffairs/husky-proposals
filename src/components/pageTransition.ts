// The transition type that makes a navigation rise into place (#73). Only
// links between pages carry it (`<Link transitionTypes={PAGE}>`), so filter
// changes, which also update the URL, never animate the page.
export const PAGE = ["page"];
