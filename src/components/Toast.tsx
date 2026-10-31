"use client";

import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { BOARDS, type BoardCode } from "@/core/boards";

// One look for every small confirmation (#67): support, participation, link
// copied. Base UI announces each to screen readers without moving focus, and
// pauses the timer while one is hovered or focused. ToastProvider wraps the
// app in layout.tsx; components call useToast(). A toast about an idea takes
// its board's color for the rule on its left.
type ToastOptions = {
  // Toasts about the same thing share an id, so a new one replaces the old
  // in place instead of stacking (support-103, copy-link).
  id?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  board?: BoardCode;
};

export function useToast() {
  const manager = Toast.useToastManager();
  return ({ id: key, title, description, action, board }: ToastOptions) => {
    // An action finishes the toast's job, so it closes it too.
    const id: string = manager.add({
      id: key,
      title,
      description,
      data: { board },
      actionProps: action && {
        children: action.label,
        onClick: () => {
          action.onClick();
          manager.close(id);
        },
      },
    });
    return id;
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider limit={3} timeout={5000}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <Toasts />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function Toasts() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => {
    const board = (toast.data as { board?: BoardCode } | undefined)?.board;
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        data-board={board ? BOARDS[board].color : undefined}
        className="toast bg-surface text-ink"
      >
        <Toast.Content className="toast-content flex items-start gap-3 p-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Toast.Title className="font-semibold" />
            <Toast.Description className="text-sm text-muted" />
          </div>
          {toast.actionProps && (
            <Toast.Action className="rounded-button bordered px-2.5 py-1 text-sm font-semibold" />
          )}
          <Toast.Close aria-label="Dismiss" className="grid size-7 shrink-0 place-items-center">
            <X aria-hidden className="size-4" />
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    );
  });
}
