import { describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "./email-automation";

describe("email automation authorization", () => {
  it("accepts only the configured bearer secret", () => {
    expect(
      isAuthorizedCronRequest({
        authorizationHeader: "Bearer cron-secret",
        cronSecret: "cron-secret",
      }),
    ).toBe(true);
    expect(
      isAuthorizedCronRequest({
        authorizationHeader: "Bearer another-secret",
        cronSecret: "cron-secret",
      }),
    ).toBe(false);
  });

  it("rejects requests when no secret is configured", () => {
    expect(
      isAuthorizedCronRequest({
        authorizationHeader: null,
      }),
    ).toBe(false);
  });
});
