import { describe, expect, it } from "vitest";

import { emailSyncErrorMessage } from "./email-sync-error";

describe("email sync errors", () => {
  it("hides internal Prisma details", () => {
    expect(
      emailSyncErrorMessage(
        new Error(
          "Invalid `prisma.emailMessage.upsert()` invocation: Transaction API error",
        ),
      ),
    ).toBe("No fue posible guardar los mensajes sincronizados.");
  });

  it("keeps provider errors useful", () => {
    expect(
      emailSyncErrorMessage(new Error("Gmail no pudo leer un mensaje (429).")),
    ).toBe("Gmail no pudo leer un mensaje (429).");
  });
});
