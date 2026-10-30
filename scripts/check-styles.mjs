// Style guard (#20, #26): agents drift into one-off values wherever nothing
// checks, so fail on them. Runs in `npm run verify`.
//
// Fails on, in src/**/*.{ts,tsx}:
// - arbitrary Tailwind values or properties, like `p-[13px]` or `[border-width:3px]`;
// - corner radius classes other than our radius tokens;
// - shadow classes other than `shadow-card` (the --card-shadow token);
// - hex colors (colors come from design/tokens.css only).
//
// Usage: node scripts/check-styles.mjs [root]   (exits 1 on any finding)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RADIUS_TOKENS = ["card", "field", "button", "chip", "none"];
const SIDES = "(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee)-";

export const rules = [
  {
    name: "arbitrary Tailwind value",
    pattern: /(?<![\w-])(?:[a-z][\w-]*:)*-?[a-z][\w-]*-\[[^\]\s]+\]/g,
  },
  {
    name: "arbitrary Tailwind property",
    pattern: /(?<![\w-])(?:[a-z][\w-]*:)*\[[a-z-]+:[^\]\s]+\]/g,
  },
  {
    name: "radius class that is not a token",
    pattern: new RegExp(
      `(?<![\\w-])(?:[a-z][\\w-]*:)*rounded(?:-${SIDES})?(?:-(?!(?:${RADIUS_TOKENS.join("|")})\\b)[\\w-]+)?(?![\\w-])`,
      "g",
    ),
    // `rounded-card`, `rounded-t-chip`, and so on are allowed.
    allow: new RegExp(`rounded-(?:${SIDES})?(?:${RADIUS_TOKENS.join("|")})$`),
  },
  {
    name: "shadow class that is not a token",
    pattern: /(?<![\w-])(?:[a-z][\w-]*:)*(?:drop-|inset-|text-)?shadow(?:-[\w-]+)?(?![\w-])/g,
    // `shadow-card` reads the --card-shadow token, so it is allowed.
    allow: /^shadow-card$/,
  },
  {
    name: "hex color",
    pattern: /["'`\s(:]#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
  },
];

// Only class-like strings are checked for Tailwind rules, to avoid flagging prose.
const CLASS_CONTEXT = /(?:className|class|cn|clsx|tw)\s*[=(]\s*(?:\{\s*)?(["'`])([\s\S]*?)\1/g;

export function findViolations(source) {
  const found = [];
  const lineOf = (index) => source.slice(0, index).split("\n").length;
  for (const match of source.matchAll(CLASS_CONTEXT)) {
    const classes = match[2];
    const offset = match.index + match[0].indexOf(classes);
    for (const rule of rules.slice(0, 4)) {
      for (const hit of classes.matchAll(rule.pattern)) {
        const token = hit[0].split(":").pop();
        if (rule.allow && rule.allow.test(token)) continue;
        found.push({ rule: rule.name, text: hit[0], line: lineOf(offset + hit.index) });
      }
    }
  }
  const hex = rules[4];
  for (const hit of source.matchAll(hex.pattern)) {
    found.push({ rule: hex.name, text: hit[0].trim(), line: lineOf(hit.index) });
  }
  return found;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === "node_modules" || name === "generated") continue;
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) yield path;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] ?? "src";
  let count = 0;
  for (const file of walk(root)) {
    for (const v of findViolations(readFileSync(file, "utf8"))) {
      console.log(`${relative(process.cwd(), file)}:${v.line}  ${v.rule}: ${v.text}`);
      count++;
    }
  }
  console.log(
    count === 0 ? "styles: ok" : `styles: ${count} problem(s). Use the tokens in design/tokens.css.`,
  );
  process.exit(count === 0 ? 0 : 1);
}
