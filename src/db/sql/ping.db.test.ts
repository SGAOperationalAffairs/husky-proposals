import { expect, it } from "vitest";
import { describeWithDatabase, getTestClient, withRollback } from "@/db/testing/database";
import { ping } from "./ping";

describeWithDatabase("database harness (#43)", () => {
  it("answers a ping on the client", async () => {
    await expect(ping(getTestClient())).resolves.toBe(true);
  });

  it("returns the callback's value from withRollback, with ping working on the transaction", async () => {
    const value = await withRollback(async (tx) => {
      await ping(tx);
      return "done";
    });
    expect(value).toBe("done");
  });

  it("lets an error thrown inside withRollback reach the caller", async () => {
    await expect(
      withRollback(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
