import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Husky Proposals",
  description: "Post an idea for campus, support the ones you care about, and follow what happens next.",
  // Public, but not searchable (PRD D18). next.config.ts also sends X-Robots-Tag.
  robots: { index: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col font-sans antialiased">{children}</body>
    </html>
  );
}
