import type { ReactNode } from "react";
import { NavTabs } from "@/components/NavTabs";
import { SiteHeader } from "@/components/SiteHeader";

// The shared frame of the tab pages (#221). Moving between tabs keeps this layout, so the
// header and its tabs stay put. Only what is under the title re-renders.
export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-8 @lg:px-8 @lg:pt-8 @lg:pb-12">
      <SiteHeader nav={<NavTabs />} />
      {children}
    </main>
  );
}
