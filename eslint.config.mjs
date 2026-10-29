import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Layering and SQL rules from CLAUDE.md, enforced from the start (#26) so
// they never need a retrofit across the codebase. In flat config the last
// matching block wins for a rule, so the strictest folders come last.
const noDeepRelative = {
  group: ["../../*"],
  message: "Imports may climb at most one folder. Use the @/ alias instead.",
};
const noPrismaOutsideDb = {
  group: ["@prisma/client", "@prisma/client/*", "@/generated/*"],
  message: "Use the shared queries in src/db/ instead of Prisma directly.",
};
const noUnsafeSql = {
  selector: "MemberExpression[property.name=/^\\$(queryRawUnsafe|executeRawUnsafe)$/]",
  message: "Never use $queryRawUnsafe or $executeRawUnsafe. Use tagged $queryRaw in src/db/sql/.",
};
const rawSqlOnlyInDbSql = {
  selector: "MemberExpression[property.name=/^\\$(queryRaw|executeRaw)$/]",
  message: "Raw SQL lives only in src/db/sql/, as tagged $queryRaw parsed with zod.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      "no-restricted-imports": ["error", { patterns: [noDeepRelative] }],
      "no-restricted-syntax": ["error", noUnsafeSql, rawSqlOnlyInDbSql],
    },
  },
  {
    // Only src/db talks to Prisma directly.
    files: ["src/**"],
    ignores: ["src/db/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [noDeepRelative, noPrismaOutsideDb] }],
    },
  },
  {
    files: ["src/db/sql/**"],
    rules: {
      "no-restricted-syntax": ["error", noUnsafeSql],
    },
  },
  {
    // Core rules are plain TypeScript: no framework, no database, no UI.
    files: ["src/core/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            noDeepRelative,
            noPrismaOutsideDb,
            {
              group: ["next", "next/*", "react", "react-dom"],
              message: "src/core never imports Next.js or React.",
            },
            { group: ["@/db", "@/db/*"], message: "src/core never imports the database. Pass data in." },
            {
              group: ["@/app", "@/app/*", "@/components/*"],
              message: "src/core never imports routes or UI.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/generated/**"]),
]);

export default eslintConfig;
