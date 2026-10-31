import { getIdea, parseIdeasNumber } from "@/app/_ideas/data";
import { posterImage } from "@/app/_share/posterImage";

// An idea's poster image (#64), downloaded from the share dialog.
export async function GET(request: Request, { params }: RouteContext<"/ideas/[number]/poster">) {
  const number = parseIdeasNumber((await params).number);
  const idea = number === undefined ? undefined : getIdea(number);
  if (!idea) return new Response("No idea with that number.", { status: 404 });
  return posterImage(idea, new URL(request.url).host);
}
