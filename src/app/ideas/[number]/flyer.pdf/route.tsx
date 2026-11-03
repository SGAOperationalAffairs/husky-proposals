import { getIdea, parseIdeasNumber } from "@/app/_ideas/data";
import { flyerImage } from "@/app/_share/flyerImage";
import { pdfFromPng } from "@/app/_share/flyerPdf";

// The flyer as a Letter PDF (issue 120), downloaded from the flyer page. The picture is
// drawn on request from the idea's text and the page is wrapped with pdfkit, so
// nothing is stored. Not indexed, like every page (`noindex`).
export async function GET(request: Request, { params }: { params: Promise<{ number: string }> }) {
  const number = parseIdeasNumber((await params).number);
  const idea = number === undefined ? undefined : await getIdea(number);
  if (!idea) return new Response("No idea with that number.", { status: 404 });

  const picture = await flyerImage(idea, new URL(request.url).origin);
  const png = new Uint8Array(await picture.arrayBuffer());
  const pdf = await pdfFromPng(png);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="husky-proposal-${idea.number}-flyer.pdf"`,
      "x-robots-tag": "noindex",
    },
  });
}
