import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createOrUpdateGmailDraft,
  fetchGmailSignature,
  hasGmailComposeScope,
  hasGmailSettingsScope,
} from "./email-providers";

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

describe("hasGmailSettingsScope", () => {
  it("detects the settings.basic scope among other granted scopes", () => {
    expect(
      hasGmailSettingsScope(
        "openid email https://www.googleapis.com/auth/gmail.settings.basic",
      ),
    ).toBe(true);
  });

  it("returns false when settings.basic was not granted", () => {
    expect(
      hasGmailSettingsScope("openid email https://www.googleapis.com/auth/gmail.compose"),
    ).toBe(false);
    expect(hasGmailSettingsScope(null)).toBe(false);
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
    expect(mime).toContain('Content-Type: text/html; charset="UTF-8"');
    expect(mime).toContain("In-Reply-To: <msg-1@empresa.cl>");
    expect(mime).toContain("References: <msg-1@empresa.cl>");
    expect(mime).toContain("<p>Gracias por escribir.</p>");
  });

  it("appends the signature after the body when provided", async () => {
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
      signatureHtml: "<div>Equipo ADENTU</div>",
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    const mime = decodeRaw(body.message.raw);
    expect(mime).toContain("<p>Gracias por escribir.</p>");
    expect(mime).toContain("<div>Equipo ADENTU</div>");
    expect(mime.indexOf("Gracias por escribir.")).toBeLessThan(
      mime.indexOf("Equipo ADENTU"),
    );
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

describe("fetchGmailSignature", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the default sendAs signature", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          sendAs: [
            { sendAsEmail: "otro@empresa.cl", signature: "<div>Otro</div>" },
            {
              sendAsEmail: "yo@empresa.cl",
              isDefault: true,
              signature: "<div>Equipo ADENTU</div>",
            },
          ],
        }),
      }),
    );

    await expect(fetchGmailSignature("token")).resolves.toBe(
      "<div>Equipo ADENTU</div>",
    );
  });

  it("returns undefined when there is no signature configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ sendAs: [{ sendAsEmail: "yo@empresa.cl", isDefault: true }] }),
      }),
    );

    await expect(fetchGmailSignature("token")).resolves.toBeUndefined();
  });

  it("throws a descriptive error when Gmail rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );

    await expect(fetchGmailSignature("token")).rejects.toThrow(
      "Gmail no pudo leer la firma (403).",
    );
  });
});
