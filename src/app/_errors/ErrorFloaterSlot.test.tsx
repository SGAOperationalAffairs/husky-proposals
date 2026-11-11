import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let appEnv = "dev";
let problem: string | null = null;
vi.mock("@/env", () => ({ env: () => ({ APP_ENV: appEnv }) }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/auth/session", () => ({ sessionProblem: async () => problem }));
vi.mock("./LiveErrorFloater", () => ({ LiveErrorFloater: () => null }));

import { ErrorFloaterGate } from "./ErrorFloaterSlot";
import { LiveErrorFloater } from "./LiveErrorFloater";

beforeEach(() => {
  problem = null;
});

describe("error floater gate (#191)", () => {
  it.each(["production", "local"])("never mounts the floater when APP_ENV is %s", async (env) => {
    appEnv = env;
    expect(await ErrorFloaterGate()).toBeNull();
  });

  it.each(["dev", "preview", "test"])("mounts the floater when APP_ENV is %s", async (env) => {
    appEnv = env;
    const result = await ErrorFloaterGate();
    expect(isValidElement(result)).toBe(true);
    expect((result as { type: unknown }).type).toBe(LiveErrorFloater);
  });

  it("hands a failed SGAuth session to the floater, on any page including /post", async () => {
    appEnv = "dev";
    problem = "sgauth_unavailable";
    const result = (await ErrorFloaterGate()) as { props: { sgauthProblem: string | null } };
    expect(result.props.sgauthProblem).toBe("sgauth_unavailable");
  });

  it("does not read the session in production", async () => {
    appEnv = "production";
    problem = "sgauth_unavailable";
    expect(await ErrorFloaterGate()).toBeNull();
  });
});
