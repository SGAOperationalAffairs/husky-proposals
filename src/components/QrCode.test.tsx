import { cleanup, render, screen } from "@testing-library/react";
import qrcode from "qrcode-generator";
import { afterEach, describe, expect, it } from "vitest";
import { QrCode, qrModules } from "./QrCode";

afterEach(cleanup);

const LINK = "https://husky-proposals.vercel.app/ideas/103";

describe("QR code in the idea page share (#64)", () => {
  it("draws every dark module of the link's code, inside a quiet zone", () => {
    const reference = qrcode(0, "M");
    reference.addData(LINK);
    reference.make();
    const n = reference.getModuleCount();
    let dark = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (reference.isDark(r, c)) dark++;

    const drawn = qrModules(LINK);
    expect(drawn.size).toBe(n + 8);
    expect(drawn.d.match(/h1v1h-1z/g)).toHaveLength(dark);
  });

  it("has a text alternative that names the link, and loads nothing from outside", () => {
    const { container } = render(<QrCode path="/ideas/103" />);
    const img = screen.getByRole("img", { name: `QR code for ${window.location.origin}/ideas/103` });
    expect(img.tagName.toLowerCase()).toBe("svg");
    expect(container.querySelector("image, img, [href]")).toBeNull();
  });
});
