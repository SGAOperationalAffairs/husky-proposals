import type { Metadata } from "next";
import { Big_Shoulders, Public_Sans } from "next/font/google";
import { ViewTransition } from "react";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

// The Poster direction's faces (#29). design/tokens.css reads these variables.
// Big Shoulders' optical-size axis gives the condensed display cut at large sizes.
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans" });
const bigShoulders = Big_Shoulders({ subsets: ["latin"], axes: ["opsz"], variable: "--font-big-shoulders" });

export const metadata: Metadata = {
  title: "Husky Proposals",
  description: "Post an idea for campus, support the ones you care about, and follow what happens next.",
  // Public, but not searchable (PRD D18). next.config.ts also sends X-Robots-Tag.
  robots: { index: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full ${publicSans.variable} ${bigShoulders.variable}`}>
      <body className="@container flex min-h-full flex-col font-sans antialiased">
        {/* One page transition everywhere (#73): new content rises into place
            when a Link marked with PAGE navigates (src/components/pageTransition.ts),
            and nothing else animates. The look is in globals.css. */}
        <ToastProvider>
          <ViewTransition default={{ page: "auto", default: "none" }}>{children}</ViewTransition>
        </ToastProvider>
      </body>
    </html>
  );
}
