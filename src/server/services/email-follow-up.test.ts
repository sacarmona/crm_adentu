import { describe, expect, it } from "vitest";

import { addBusinessDays, outboundEmailFollowUp } from "./email-follow-up";

describe("email follow-up helpers", () => {
  it("skips weekends when adding business days", () => {
    expect(addBusinessDays(new Date("2026-07-17T14:00:00.000Z"), 2).toISOString()).toBe(
      "2026-07-21T14:00:00.000Z",
    );
  });

  it("builds outbound follow-up tasks from the sent email perspective", () => {
    const followUp = outboundEmailFollowUp({
      sentAt: new Date("2026-07-14T10:00:00.000Z"),
      subject: "Propuesta tecnica",
      opportunityName: "Inspeccion minera",
    });

    expect(followUp.title).toBe("Follow up correo enviado: Inspeccion minera");
    expect(followUp.dueDate.toISOString()).toBe("2026-07-16T10:00:00.000Z");
  });
});
