import { readFileSync } from "node:fs";
import { expect } from "vitest";

// Test-only, never imported by app code. Core cannot import Prisma, so tests
// read an enum's members out of the schema as text (#50).
export function prismaEnum(name: string): string[] {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const match = new RegExp(`enum ${name} \\{([^}]*)\\}`).exec(schema);
  expect(match, `enum ${name} not found in prisma/schema.prisma`).not.toBeNull();
  return match![1]!
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .filter((line) => line !== "");
}
