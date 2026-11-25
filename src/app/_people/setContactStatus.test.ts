import { describe, expect, it } from "vitest";
import type { Viewer } from "@/core/permissions";
import { setContactStatus, type ContactStore } from "./setContactStatus";

// Marking a volunteer Joined or Not now (#129). A leader who can see the People list for the
// idea's board may do it. Anyone else gets the same "not found" as a missing row, so the action
// does not reveal which volunteers exist on boards the leader does not run.

const USER = "11111111-1111-4111-8111-111111111111";
const IDEA = "22222222-2222-4222-8222-222222222222";

function fakeStore(boardId: "DAB" | "CPAB" | null) {
  const writes: { userId: string; ideaId: string; status: string }[] = [];
  const store: ContactStore = {
    findParticipation: async () => (boardId === null ? null : { boardId }),
    setStatus: async (userId, ideaId, status) => {
      writes.push({ userId, ideaId, status });
    },
  };
  return { store, writes };
}

const chairOf = (board: "DAB" | "CPAB"): Viewer => ({
  user: { id: "chair" },
  roles: { vpCampusAffairs: false, executiveBoard: false, leads: [board], memberOf: [] },
});
const student: Viewer = {
  user: { id: "s" },
  roles: { vpCampusAffairs: false, executiveBoard: false, leads: [], memberOf: [] },
};

describe("setContactStatus", () => {
  it("a chair marks a volunteer on their board joined", async () => {
    const { store, writes } = fakeStore("DAB");
    const result = await setContactStatus(store, chairOf("DAB"), {
      userId: USER,
      ideaId: IDEA,
      status: "joined",
    });
    expect(result).toEqual({ ok: true });
    expect(writes).toEqual([{ userId: USER, ideaId: IDEA, status: "joined" }]);
  });

  it("maps Not now to the 'later' status", async () => {
    const { store, writes } = fakeStore("DAB");
    await setContactStatus(store, chairOf("DAB"), { userId: USER, ideaId: IDEA, status: "later" });
    expect(writes).toEqual([{ userId: USER, ideaId: IDEA, status: "later" }]);
  });

  it("a chair moves a volunteer back to To contact, so the list shows them again", async () => {
    const { store, writes } = fakeStore("DAB");
    const result = await setContactStatus(store, chairOf("DAB"), {
      userId: USER,
      ideaId: IDEA,
      status: "new",
    });
    expect(result).toEqual({ ok: true });
    expect(writes).toEqual([{ userId: USER, ideaId: IDEA, status: "new" }]);
  });

  it("refuses a leader from another board, as if the row did not exist", async () => {
    const { store, writes } = fakeStore("DAB");
    const result = await setContactStatus(store, chairOf("CPAB"), {
      userId: USER,
      ideaId: IDEA,
      status: "joined",
    });
    expect(result).toEqual({ ok: false, error: { code: "not_found" } });
    expect(writes).toEqual([]);
  });

  it("refuses a student, and a missing row, with the same code", async () => {
    const a = fakeStore("DAB");
    const b = fakeStore(null);
    const asStudent = await setContactStatus(a.store, student, {
      userId: USER,
      ideaId: IDEA,
      status: "joined",
    });
    const missing = await setContactStatus(b.store, chairOf("DAB"), {
      userId: USER,
      ideaId: IDEA,
      status: "joined",
    });
    expect(asStudent).toEqual({ ok: false, error: { code: "not_found" } });
    expect(missing).toEqual(asStudent);
    expect(a.writes).toEqual([]);
  });

  it("rejects a status other than new, joined, or later, and a malformed id", async () => {
    const { store, writes } = fakeStore("DAB");
    const bad = await setContactStatus(store, chairOf("DAB"), {
      userId: USER,
      ideaId: IDEA,
      status: "contacted",
    });
    const badId = await setContactStatus(store, chairOf("DAB"), {
      userId: "nope",
      ideaId: IDEA,
      status: "joined",
    });
    expect(bad).toEqual({ ok: false, error: { code: "invalid" } });
    expect(badId).toEqual({ ok: false, error: { code: "invalid" } });
    expect(writes).toEqual([]);
  });
});
