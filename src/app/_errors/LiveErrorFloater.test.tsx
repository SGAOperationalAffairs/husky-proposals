import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveErrorFloater } from "./LiveErrorFloater";

afterEach(cleanup);

describe("LiveErrorFloater (#191)", () => {
  it("shows a Browser entry for an uncaught exception", () => {
    render(<LiveErrorFloater sgauthProblem={null} />);
    act(() => {
      window.dispatchEvent(new ErrorEvent("error", { error: new Error("thrown in the browser") }));
    });
    expect(screen.getByText("Browser")).toBeTruthy();
    expect(screen.getByText("thrown in the browser")).toBeTruthy();
  });

  it("shows a Browser entry for a rejected promise", () => {
    render(<LiveErrorFloater sgauthProblem={null} />);
    const event = new Event("unhandledrejection");
    Object.assign(event, { reason: new Error("rejected later") });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(screen.getByText("rejected later")).toBeTruthy();
  });

  it("shows nothing until something is reported", () => {
    render(<LiveErrorFloater sgauthProblem={null} />);
    expect(screen.queryByRole("region", { name: "Errors on this page" })).toBeNull();
  });

  it("reports an SGAuth session problem from the server, once", () => {
    const { rerender } = render(<LiveErrorFloater sgauthProblem="invalid_session_response" />);
    expect(screen.getByText("SGAuth")).toBeTruthy();
    expect(screen.getByText("SGAuth session: invalid_session_response")).toBeTruthy();
    rerender(<LiveErrorFloater sgauthProblem="invalid_session_response" />);
    expect(screen.queryByText(/times/)).toBeNull();
  });

  it("stops listening when unmounted", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<LiveErrorFloater sgauthProblem={null} />);
    unmount();
    expect(remove.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(["error", "unhandledrejection"]),
    );
    remove.mockRestore();
  });
});
