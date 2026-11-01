"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import { Download, Mail, MessageSquare, Printer, Share2 } from "lucide-react";
import Image from "next/image";
import { BOARDS } from "@/core/boards";
import { Button, buttonLook } from "./Button";
import { CopyLink } from "./CopyLink";
import { Flyer, type FlyerData } from "./Flyer";
import { tabLook } from "./tabLook";
import { useOrigin } from "./useOrigin";

// Share an idea (#64, the prototype's share sheet): its link, with ways to
// send it; a poster image for stories and group chats; and a printable flyer
// with a QR code. A sheet on phones, a dialog on wider screens (.sheet).
const TABS = [
  ["link", "Link"],
  ["poster", "Poster"],
  ["flyer", "Flyer"],
] as const;

export function ShareDialog(idea: FlyerData) {
  const origin = useOrigin();
  const path = `/ideas/${idea.number}`;
  const url = `${origin ?? ""}${path}`;
  // Never a promise (CLAUDE.md, product rules): support helps SGA decide.
  const message = `"${idea.title}" on Husky Proposals. Support helps SGA decide: ${url}`;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    // trap-focus, not a full modal: focus stays inside, but the page is not made
    // inert, so the "Link copied." toast is heard and its buttons work.
    <Dialog.Root modal="trap-focus">
      <Dialog.Trigger render={<Button />}>
        <Share2 aria-hidden className="size-4" />
        Share
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup
          data-board={BOARDS[idea.board].color}
          className="sheet sheet-wide board-accent flex flex-col gap-4 bg-surface text-ink"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="heading text-4xl">Share this idea</Dialog.Title>
            <Dialog.Close render={<Button size="sm" />}>Close</Dialog.Close>
          </div>
          <Tabs.Root defaultValue="link" className="flex flex-col gap-4">
            <Tabs.List aria-label="Share as" className="flex gap-0.5 border-b border-line">
              {TABS.map(([value, label]) => (
                <Tabs.Tab key={value} value={value} className={(state) => tabLook(state.active)}>
                  {label}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <Tabs.Panel value="link" className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Link to this idea</span>
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-field bordered bg-bg px-3 py-2"
                />
              </label>
              <div className="flex">
                <CopyLink text={url} board={idea.board} />
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`sms:?&body=${encodeURIComponent(message)}`} className={buttonLook()}>
                  <MessageSquare aria-hidden className="size-4" />
                  Text
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(idea.title)}&body=${encodeURIComponent(message)}`}
                  className={buttonLook()}
                >
                  <Mail aria-hidden className="size-4" />
                  Email
                </a>
                {canShare && (
                  <Button
                    onClick={() => navigator.share({ title: idea.title, text: message, url }).catch(() => {})}
                  >
                    <Share2 aria-hidden className="size-4" />
                    More ways
                  </Button>
                )}
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="poster" className="flex flex-col gap-4">
              <Image
                src={`${path}/poster`}
                alt={`Poster for #${idea.number}: ${idea.title}`}
                width={1080}
                height={1350}
                unoptimized
                className="mx-auto h-80 w-auto bordered"
              />
              <a
                href={`${path}/poster`}
                download={`idea-${idea.number}-poster.png`}
                className={buttonLook("primary")}
              >
                <Download aria-hidden className="size-4" />
                Download poster
              </a>
              <p className="text-sm text-muted">
                A picture for stories and group chats. It shows today&rsquo;s support count, so it goes out of
                date as support grows.
              </p>
            </Tabs.Panel>

            <Tabs.Panel value="flyer" className="flex flex-col gap-4">
              <div className="print-exact mx-auto w-full max-w-sm bordered bg-paper p-4">
                <Flyer {...idea} />
              </div>
              <a href={`${path}/flyer`} target="_blank" rel="noopener" className={buttonLook("primary")}>
                <Printer aria-hidden className="size-4" />
                Open the flyer to print
              </a>
              <p className="text-sm text-muted">
                For tabling and bulletin boards. To get a PDF, choose Save as PDF in the print dialog.
              </p>
            </Tabs.Panel>
          </Tabs.Root>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
