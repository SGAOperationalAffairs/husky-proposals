import type { Metadata } from "next";
import { Playground } from "@/playground/Playground";

// Local and test only (see next.config.ts). Never in a production build.
export const metadata: Metadata = { title: "Husky Proposals playground" };

export default function PlaygroundPage() {
  return <Playground />;
}
