import {
  EmailDirection,
  EmailDiscardRuleType,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({ prisma: {} }));

import {
  discardRuleValue,
  ruleMatchesMessage,
  senderDomain,
} from "./email-discard-rules";

describe("email discard rules", () => {
  it("extracts normalized sender domains", () => {
    expect(senderDomain("NEWS@Example.COM")).toBe("example.com");
  });

  it("matches sender, domain and subject rules", () => {
    const message = {
      direction: EmailDirection.INBOUND,
      fromAddress: "news@example.com",
      subject: "Boletin semanal de novedades",
    };
    expect(
      ruleMatchesMessage(
        {
          type: EmailDiscardRuleType.SENDER_EXACT,
          value: "news@example.com",
          direction: EmailDirection.INBOUND,
        },
        message,
      ),
    ).toBe(true);
    expect(
      ruleMatchesMessage(
        {
          type: EmailDiscardRuleType.SENDER_DOMAIN,
          value: "example.com",
          direction: null,
        },
        message,
      ),
    ).toBe(true);
    expect(
      ruleMatchesMessage(
        {
          type: EmailDiscardRuleType.SUBJECT_CONTAINS,
          value: "boletin semanal",
          direction: null,
        },
        message,
      ),
    ).toBe(true);
  });

  it("rejects overly short subject rules", () => {
    expect(() =>
      discardRuleValue({
        type: EmailDiscardRuleType.SUBJECT_CONTAINS,
        fromAddress: "news@example.com",
        subject: "RE",
      }),
    ).toThrow();
  });
});
