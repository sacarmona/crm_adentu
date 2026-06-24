import { EmailProvider } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  createEmailOAuthState,
  verifyEmailOAuthState,
} from "./email-oauth-state";

describe("email OAuth state", () => {
  it("round-trips signed user and provider data", () => {
    const state = createEmailOAuthState({
      userId: "user-1",
      provider: EmailProvider.GMAIL,
    });

    expect(verifyEmailOAuthState(state)).toMatchObject({
      userId: "user-1",
      provider: EmailProvider.GMAIL,
    });
  });

  it("rejects state tampering", () => {
    const state = createEmailOAuthState({
      userId: "user-1",
      provider: EmailProvider.MICROSOFT,
    });

    expect(() => verifyEmailOAuthState(`${state}x`)).toThrow();
  });
});
