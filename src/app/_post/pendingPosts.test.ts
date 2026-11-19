import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { rolesFromPositions } from "@/core/positions";
import { pendingCountFor } from "./pendingPosts";

// The count the post form shows (#96). A visitor has no posts, so the store is never asked.
const session: Session = {
  user: { id: "student-1", email: "maya.test@example.com", name: "Maya Test" },
  positions: [],
  roles: rolesFromPositions([]),
};

describe("pendingCountFor (#96)", () => {
  it("is null for a visitor, and never reads the store", async () => {
    const count = vi.fn();
    expect(await pendingCountFor(null, count)).toBeNull();
    expect(count).not.toHaveBeenCalled();
  });

  it.each([0, 2, 3])("is the store's count for the signed-in student at %i pending", async (n) => {
    const count = vi.fn().mockResolvedValue(n);
    expect(await pendingCountFor(session, count)).toBe(n);
    expect(count).toHaveBeenCalledExactlyOnceWith("student-1");
  });
});
