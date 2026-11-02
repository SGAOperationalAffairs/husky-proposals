import { connection } from "next/server";
import { listWall } from "./data";
import { IdeaWall } from "./IdeaWall";

// Loads a list's public ideas once and hands them to the wall, which filters
// in the browser (#61, #63). Rendered per request, so the first page arrives
// with the URL's filters already applied, even before JavaScript runs.
export async function Wall() {
  await connection();
  return <IdeaWall ideas={listWall()} />;
}
