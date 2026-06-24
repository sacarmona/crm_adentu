import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { canAdminister, canWrite } from "./authorization-policy";

describe("role authorization", () => {
  it("allows ADMIN and COMERCIAL to write", () => {
    expect(canWrite(UserRole.ADMIN)).toBe(true);
    expect(canWrite(UserRole.COMERCIAL)).toBe(true);
    expect(canWrite(UserRole.LECTURA)).toBe(false);
  });

  it("reserves administration for ADMIN", () => {
    expect(canAdminister(UserRole.ADMIN)).toBe(true);
    expect(canAdminister(UserRole.COMERCIAL)).toBe(false);
    expect(canAdminister(UserRole.LECTURA)).toBe(false);
  });
});
