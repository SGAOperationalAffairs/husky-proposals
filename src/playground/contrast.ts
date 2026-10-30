// WCAG contrast between two #rrggbb colors. Shared by the token contrast test
// (src/app/contrast.test.ts, #37) and the playground's board color pickers
// (#61), so the readout and the test can never disagree.
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// AA needs 4.5:1 for normal text and 3:1 for large text, such as headlines.
export function contrastVerdict(ratio: number) {
  if (ratio >= 4.5) return "passes AA";
  if (ratio >= 3) return "headlines only; small text fails AA";
  return "fails AA";
}
