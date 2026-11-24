import { describe, expect, it, vi } from "vitest";
import { signUnsubscribeToken } from "@/email/unsubscribeToken";
import { unsubscribe } from "./unsubscribe";

// The unsubscribe rule (#212) with a fake store: nothing here touches a database.
const SECRET = "k".repeat(40);
const userId = "00000000-0000-4000-8000-0000000000a1";
const good = signUnsubscribeToken(SECRET, "digest", userId);

const fakeStore = () => ({ turnOff: vi.fn(async () => undefined) });

describe("unsubscribe (#212)", () => {
  it("turns off the token's type for the token's student", async () => {
    const store = fakeStore();
    expect(await unsubscribe(store, SECRET, { token: good })).toEqual({ ok: true, type: "digest" });
    expect(store.turnOff).toHaveBeenCalledTimes(1);
    expect(store.turnOff).toHaveBeenCalledWith(userId, "digest");
  });

  it("says invalid for input that is not a token string, and writes nothing", async () => {
    const store = fakeStore();
    for (const raw of [
      undefined,
      null,
      {},
      { token: "" },
      { token: 5 },
      { token: "x".repeat(201) },
      "digest",
    ]) {
      expect(await unsubscribe(store, SECRET, raw), JSON.stringify(raw)).toEqual({
        ok: false,
        error: { code: "invalid" },
      });
    }
    expect(store.turnOff).not.toHaveBeenCalled();
  });

  it("says invalid when the site has no link secret, even for a token that would verify", async () => {
    const store = fakeStore();
    expect(await unsubscribe(store, undefined, { token: good })).toEqual({
      ok: false,
      error: { code: "invalid" },
    });
    expect(store.turnOff).not.toHaveBeenCalled();
  });

  it("says invalid for a bad signature, another secret, or a changed student, and writes nothing", async () => {
    const store = fakeStore();
    const [type, , signature] = good.split(".") as [string, string, string];
    const tokens = [
      `${type}.${userId}.${signature.startsWith("A") ? "B" : "A"}${signature.slice(1)}`,
      `${type}.00000000-0000-4000-8000-0000000000a2.${signature}`,
      signUnsubscribeToken("z".repeat(40), "digest", userId),
    ];
    for (const token of tokens) {
      expect(await unsubscribe(store, SECRET, { token })).toEqual({ ok: false, error: { code: "invalid" } });
    }
    expect(store.turnOff).not.toHaveBeenCalled();
  });

  it("ignores a user id or type in the request: only the signed token counts", async () => {
    const store = fakeStore();
    await unsubscribe(store, SECRET, {
      token: good,
      userId: "00000000-0000-4000-8000-0000000000ff",
      type: "post_decided",
    });
    expect(store.turnOff).toHaveBeenCalledWith(userId, "digest");
  });
});
