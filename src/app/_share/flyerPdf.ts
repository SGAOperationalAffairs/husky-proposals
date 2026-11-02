import PDFDocument from "pdfkit";

// Wraps one picture in a single US Letter page (issue 120). The picture is the flyer,
// drawn by flyerImage.tsx, so the PDF has no text of its own: no fonts to embed,
// and nothing to split across pages. Letter is 8.5 by 11 inches, which is 612 by
// 792 points.
export function pdfFromPng(png: Uint8Array): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margin: 0,
      autoFirstPage: true,
      info: { Title: "Husky Proposals flyer" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.image(Buffer.from(png), 0, 0, { width: 612, height: 792 });
    doc.end();
  });
}
