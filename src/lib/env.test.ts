import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_AUTO_CLASSIFY = process.env.EMAIL_AUTO_CLASSIFY;
const ORIGINAL_AUTO_CLASSIFY_LIMIT = process.env.EMAIL_AUTO_CLASSIFY_LIMIT;

describe("env", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_AUTO_CLASSIFY === undefined) {
      delete process.env.EMAIL_AUTO_CLASSIFY;
    } else {
      process.env.EMAIL_AUTO_CLASSIFY = ORIGINAL_AUTO_CLASSIFY;
    }
    if (ORIGINAL_AUTO_CLASSIFY_LIMIT === undefined) {
      delete process.env.EMAIL_AUTO_CLASSIFY_LIMIT;
    } else {
      process.env.EMAIL_AUTO_CLASSIFY_LIMIT = ORIGINAL_AUTO_CLASSIFY_LIMIT;
    }
  });

  it("tolerates a literally-quoted boolean pasted from .env.example", async () => {
    process.env.EMAIL_AUTO_CLASSIFY = '"false"';
    const { env } = await import("./env");
    expect(env.EMAIL_AUTO_CLASSIFY).toBe("false");
  });

  it("tolerates a literally-quoted number pasted from .env.example", async () => {
    process.env.EMAIL_AUTO_CLASSIFY_LIMIT = '"5"';
    const { env } = await import("./env");
    expect(env.EMAIL_AUTO_CLASSIFY_LIMIT).toBe(5);
  });

  it("is case-insensitive for the boolean flag", async () => {
    process.env.EMAIL_AUTO_CLASSIFY = "TRUE";
    const { env } = await import("./env");
    expect(env.EMAIL_AUTO_CLASSIFY).toBe("true");
  });

  it("still rejects genuinely invalid values", async () => {
    process.env.EMAIL_AUTO_CLASSIFY = "maybe";
    await expect(import("./env")).rejects.toThrow();
  });
});
