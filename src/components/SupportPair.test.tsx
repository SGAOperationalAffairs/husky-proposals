import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SupportPair } from "./SupportPair";

afterEach(cleanup);

// A page's state around the pair, the way the playground holds it.
function Harness({
  look,
  onParticipate,
}: {
  look: "icons" | "buttons";
  onParticipate: (v: boolean) => void;
}) {
  const [participating, setParticipating] = useState(false);
  const [supported, setSupported] = useState(false);
  return (
    <SupportPair
      look={look}
      ideaNumber={103}
      supported={supported}
      participating={participating}
      onSupportChange={setSupported}
      onParticipateChange={(v) => {
        onParticipate(v);
        setParticipating(v);
      }}
    />
  );
}

// The pair's own button, found by its pressed state, so it never matches the dialog's confirm.
const handButton = () =>
  screen
    .getAllByRole("button", { name: /I'll participate|Participating/ })
    .find((b) => b.hasAttribute("aria-pressed"))!;
const dialog = () => screen.queryByRole("dialog");

describe.each(["icons", "buttons"] as const)("I'll participate asks first (#67), %s look", (look) => {
  it("counts only after the student confirms", async () => {
    const onParticipate = vi.fn();
    render(<Harness look={look} onParticipate={onParticipate} />);
    fireEvent.click(handButton());
    const open = await screen.findByRole("dialog");
    expect(onParticipate).not.toHaveBeenCalled();
    fireEvent.click(within(open).getByRole("button", { name: "I'll participate" }));
    expect(onParticipate).toHaveBeenCalledWith(true);
  });

  it("saves nothing on Cancel, and focus returns to the button", async () => {
    const onParticipate = vi.fn();
    render(<Harness look={look} onParticipate={onParticipate} />);
    const opener = handButton();
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(dialog()).toBeNull();
    expect(onParticipate).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });

  it("saves nothing on Escape", async () => {
    const onParticipate = vi.fn();
    render(<Harness look={look} onParticipate={onParticipate} />);
    fireEvent.click(handButton());
    const open = await screen.findByRole("dialog");
    fireEvent.keyDown(open, { key: "Escape" });
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(dialog()).toBeNull();
    expect(onParticipate).not.toHaveBeenCalled();
  });

  it("withdraws without a dialog, and Support never asks", async () => {
    const onParticipate = vi.fn();
    render(<Harness look={look} onParticipate={onParticipate} />);
    fireEvent.click(handButton());
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "I'll participate" }),
    );
    await act(() => new Promise((r) => setTimeout(r, 50)));
    fireEvent.click(screen.getByRole("button", { pressed: true, name: /participat/i }));
    expect(onParticipate).toHaveBeenLastCalledWith(false);
    expect(dialog()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Support/ }));
    expect(dialog()).toBeNull();
  });
});

describe("the confirmation's words (#67)", () => {
  it("says who sees the name and email, and does not promise action", async () => {
    render(<Harness look="buttons" onParticipate={() => {}} />);
    fireEvent.click(handButton());
    const open = await screen.findByRole("dialog");
    expect(open.textContent).toMatch(/northeastern\.edu email/);
    expect(open.textContent).toMatch(/may email you/);
    expect(open.textContent).not.toMatch(/will (email|contact) you|guarantee|petition/i);
  });
});
