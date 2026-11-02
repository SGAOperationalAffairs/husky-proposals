import { describe, expect, it } from "vitest";
import { pdfFromPng } from "./flyerPdf";

// A one-pixel PNG, enough to check the PDF wrapper without rendering a flyer (#120).
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

describe("flyer PDF (#120)", () => {
  it("returns a PDF file", async () => {
    const pdf = await pdfFromPng(PNG_1X1);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("is one US Letter page, 8.5 by 11 inches, in points", async () => {
    const text = (await pdfFromPng(PNG_1X1)).toString("latin1");
    expect(text).toMatch(/\/MediaBox\s*\[\s*0\s+0\s+612\s+792\s*\]/);
    expect(text.match(/\/Type\s*\/Page[^s]/g)).toHaveLength(1);
  });

  it("embeds the image, so the flyer is the picture and nothing else", async () => {
    const text = (await pdfFromPng(PNG_1X1)).toString("latin1");
    expect(text).toMatch(/\/Subtype\s*\/Image/);
  });
});
