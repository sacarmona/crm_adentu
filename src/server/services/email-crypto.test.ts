import { beforeAll, describe, expect, it } from "vitest";

describe("email token encryption", () => {
  beforeAll(() => {
    process.env.EMAIL_TOKEN_ENCRYPTION_KEY = "phase-14a-test-secret";
  });

  it("encrypts tokens with authenticated encryption", async () => {
    const { decryptEmailToken, encryptEmailToken } = await import("./email-crypto");
    const encrypted = encryptEmailToken("oauth-access-token");

    expect(encrypted).not.toContain("oauth-access-token");
    expect(decryptEmailToken(encrypted)).toBe("oauth-access-token");
  });

  it("rejects altered ciphertext", async () => {
    const { decryptEmailToken, encryptEmailToken } = await import("./email-crypto");
    const encrypted = encryptEmailToken("oauth-access-token");
    const altered = `${encrypted.slice(0, -1)}x`;

    expect(() => decryptEmailToken(altered)).toThrow();
  });
});
