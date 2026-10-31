import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./Toast";

afterEach(cleanup);

function Demo({ onUndo }: { onUndo: () => void }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast({
          title: "You support #103.",
          description: "Support helps SGA decide!",
          action: { label: "Undo", onClick: onUndo },
          board: "DAB",
        })
      }
    >
      Show
    </button>
  );
}

const settle = () => act(() => new Promise((r) => setTimeout(r, 50)));

describe("toast (#67)", () => {
  it("shows a title and description, in the board's color", async () => {
    render(
      <ToastProvider>
        <Demo onUndo={() => {}} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    const title = await screen.findByText("You support #103.");
    expect(screen.getByText("Support helps SGA decide!")).toBeTruthy();
    expect(title.closest("[data-board]")?.getAttribute("data-board")).toBe("dining");
  });

  it("runs its action and closes", async () => {
    const onUndo = vi.fn();
    render(
      <ToastProvider>
        <Demo onUndo={onUndo} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledOnce();
    await settle();
    expect(screen.queryByText("You support #103.")).toBeNull();
  });

  it("can be dismissed", async () => {
    render(
      <ToastProvider>
        <Demo onUndo={() => {}} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    // Base UI hides Close from screen readers until the stack is hovered or focused.
    fireEvent.click(await screen.findByLabelText("Dismiss"));
    await settle();
    expect(screen.queryByText("You support #103.")).toBeNull();
  });
});
