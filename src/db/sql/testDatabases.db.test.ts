import { expect, inject, it } from "vitest";
import { describeWithDatabase, getAdminClient, getTestClient } from "@/db/testing/database";
import { createRunRegistry } from "@/db/testing/runDatabase";
import { createDatabase, currentDatabase, dropDatabase } from "./testDatabases";

describeWithDatabase("test database admin SQL (#104)", () => {
  it("runs the tests in the run's own database", async () => {
    await expect(currentDatabase(getTestClient())).resolves.toBe(inject("testDatabaseName"));
  });

  it("creates and drops a probe database", async () => {
    const admin = getAdminClient();
    const registry = createRunRegistry();
    const probe = `${inject("testDatabaseName")}_p`;
    const exists = async () =>
      (
        await admin.$queryRaw<{ n: bigint }[]>`select count(*) as n from pg_database where datname = ${probe}`
      )[0]!.n;

    await createDatabase(admin, probe, registry);
    expect(await exists()).toBe(1n);
    await dropDatabase(admin, probe, registry);
    expect(await exists()).toBe(0n);
  });

  it("refuses to drop a database this run did not create", async () => {
    const admin = getAdminClient();
    const name = inject("testDatabaseName")!;
    await expect(dropDatabase(admin, name, createRunRegistry())).rejects.toThrow(/did not create it/);
    await expect(currentDatabase(getTestClient())).resolves.toBe(name);
  });

  it("refuses a name outside the run database pattern", async () => {
    const registry = createRunRegistry();
    registry.add("postgres");
    await expect(dropDatabase(getAdminClient(), "postgres", registry)).rejects.toThrow(/test run database/);
  });
});
