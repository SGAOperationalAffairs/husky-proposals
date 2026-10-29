import { Barlow_Condensed, Bricolage_Grotesque, Hanken_Grotesk, Newsreader } from "next/font/google";
import type { ReactNode } from "react";

// Fonts the templates can use. Loaded only here, so the app itself ships the
// system font until a direction is picked.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--pg-font-bricolage" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--pg-font-newsreader" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--pg-font-hanken" });
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--pg-font-barlow" });

// A plain children type, not LayoutProps<"/playground">: production builds
// leave this route out, so the generated route types do not include it.
export default function PlaygroundLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${bricolage.variable} ${newsreader.variable} ${hanken.variable} ${barlow.variable} contents`}
    >
      {children}
    </div>
  );
}
