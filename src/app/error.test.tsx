import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { enableReports, getSnapshot } from "./_errors/reports";
import RootError from "./error";

afterEach(cleanup);

describe("root error screen (#191)", () => {
  it("shows plain copy with no detail, and Try again retries", () => {
    const retry = vi.fn();
    const error = Object.assign(new Error("secret detail"), { digest: "d1" });
    render(<RootError error={error} retry={retry} />);
    expect(screen.getByRole("heading", { name: "Something went wrong on this page." })).toBeTruthy();
    expect(screen.queryByText(/secret detail|d1/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("reports the message and digest as a Page error when the floater is on", () => {
    const disable = enableReports();
    render(<RootError error={Object.assign(new Error("render failed"), { digest: "d2" })} retry={vi.fn()} />);
    expect(getSnapshot().entries[0]).toMatchObject({
      source: "route",
      message: "render failed (digest d2)",
    });
    disable();
  });

  it("reports nothing when the floater is off, as in production", () => {
    render(<RootError error={new Error("x")} retry={vi.fn()} />);
    expect(getSnapshot().entries).toEqual([]);
  });
});
