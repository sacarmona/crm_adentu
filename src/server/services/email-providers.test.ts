import { afterEach, describe, expect, it, vi } from "vitest";

import { createOrUpdateGmailDraft, hasGmailComposeScope } from "./email-providers";

function decodeRaw(raw: string) {
  return Buffer.from(raw, "base64url").toString("utf-8");
}

describe("hasGmailComposeScope", () => {
  it("detects the compose scope among other granted scopes", () => {
    expect(
      hasGmailComposeScope(
        "openid email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose",
      ),
    ).toBe(true);
  });

  it("returns false when compose was not granted", () => {
    expect(
      hasGmailComposeScope("openid email https://www.googleapis.com/auth/gmail.readonly"),
    ).toBe(false);
    expect(hasGmailComposeScope(null)).toBe(false);
    expect(hasGmailComposeScope(undefined)).toBe(false);
  });
});

describe("createOrUpdateGmailDraft", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a new draft with reply headers when there is no provider id yet", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "gmail-draft-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createOrUpdateGmailDraft({
      accessToken: "token",
      to: "cliente@empresa.cl",
      subject: "Re: Consulta",
      body: "Gracias por escribir.",
      threadId: "thread-1",
      inReplyTo: "<msg-1@empresa.cl>",
    });

    expect(result).toEqual({ id: "gmail-draft-1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/drafts");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string);
    expect(body.message.threadId).toBe("thread-1");
    const mime = decodeRaw(body.message.raw);
    expect(mime).toContain("In-Reply-To: <msg-1@empresa.cl>");
    expect(mime).toContain("References: <msg-1@empresa.cl>");
    expect(mime).toContain("Gracias por escribir.");
  });

  it("updates the existing remote draft with PUT when a provider id is present", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "gmail-draft-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await createOrUpdateGmailDraft({
      accessToken: "token",
      to: "cliente@empresa.cl",
      subject: "Re: Consulta",
      body: "Gracias por escribir.",
      providerDraftId: "gmail-draft-1",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://gmail.googleapis.com/gmail/v1/users/me/drafts/gmail-draft-1",
    );
    expect(init.method).toBe("PUT");
  });

  it("throws a descriptive error when Gmail rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );

    await expect(
      createOrUpdateGmailDraft({
        accessToken: "token",
        to: "cliente@empresa.cl",
        subject: "Re: Consulta",
        body: "Gracias por escribir.",
      }),
    ).rejects.toThrow("Gmail no pudo guardar el borrador (403).");
  });
});
