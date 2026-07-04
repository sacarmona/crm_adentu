import { EmailProvider } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, createOrUpdateGmailDraftMock, usableEmailAccessTokenMock } =
  vi.hoisted(() => ({
    prismaMock: {
      emailDraft: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      emailConnection: {
        update: vi.fn(),
      },
    },
    createOrUpdateGmailDraftMock: vi.fn(),
    usableEmailAccessTokenMock: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/server/services/email-providers", async () => {
  const actual = await vi.importActual<
    typeof import("./email-providers")
  >("./email-providers");
  return {
    ...actual,
    createOrUpdateGmailDraft: createOrUpdateGmailDraftMock,
    usableEmailAccessToken: usableEmailAccessTokenMock,
  };
});

import { pushEmailDraftToMailbox } from "./email-draft-sync";

function draftFixture(overrides: Partial<{
  provider: EmailProvider;
  scope: string | null;
  providerDraftId: string | null;
}> = {}) {
  return {
    id: "draft-1",
    subject: "Re: Consulta",
    body: "Gracias por escribir.",
    providerDraftId: overrides.providerDraftId ?? null,
    emailMessage: {
      fromAddress: "cliente@empresa.cl",
      threadId: "thread-1",
      messageIdHeader: "<msg-1@empresa.cl>",
      connection: {
        id: "conn-1",
        provider: overrides.provider ?? EmailProvider.GMAIL,
        scope:
          overrides.scope !== undefined
            ? overrides.scope
            : "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose",
        accessTokenEncrypted: "enc-access",
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
      },
    },
  };
}

describe("pushEmailDraftToMailbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks unsupported providers without calling Gmail", async () => {
    prismaMock.emailDraft.findUnique.mockResolvedValue(
      draftFixture({ provider: EmailProvider.MICROSOFT }),
    );

    await pushEmailDraftToMailbox("draft-1");

    expect(createOrUpdateGmailDraftMock).not.toHaveBeenCalled();
    expect(prismaMock.emailDraft.update).toHaveBeenCalledWith({
      where: { id: "draft-1" },
      data: {
        pushError: "Guardado automatico aun no disponible para Microsoft.",
      },
    });
  });

  it("asks for reconnection when the compose scope is missing", async () => {
    prismaMock.emailDraft.findUnique.mockResolvedValue(
      draftFixture({
        scope: "https://www.googleapis.com/auth/gmail.readonly",
      }),
    );

    await pushEmailDraftToMailbox("draft-1");

    expect(createOrUpdateGmailDraftMock).not.toHaveBeenCalled();
    expect(prismaMock.emailDraft.update).toHaveBeenCalledWith({
      where: { id: "draft-1" },
      data: {
        pushError:
          "Reconecta tu cuenta de Gmail para guardar este borrador en tu buzon.",
      },
    });
  });

  it("creates a new draft and stores the returned provider id", async () => {
    prismaMock.emailDraft.findUnique.mockResolvedValue(draftFixture());
    usableEmailAccessTokenMock.mockResolvedValue({
      accessToken: "access-token",
      refreshed: null,
    });
    createOrUpdateGmailDraftMock.mockResolvedValue({ id: "gmail-draft-1" });

    await pushEmailDraftToMailbox("draft-1");

    expect(createOrUpdateGmailDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "access-token",
        to: "cliente@empresa.cl",
        subject: "Re: Consulta",
        body: "Gracias por escribir.",
        threadId: "thread-1",
        inReplyTo: "<msg-1@empresa.cl>",
        providerDraftId: undefined,
      }),
    );
    expect(prismaMock.emailDraft.update).toHaveBeenCalledWith({
      where: { id: "draft-1" },
      data: {
        providerDraftId: "gmail-draft-1",
        pushedAt: expect.any(Date),
        pushError: null,
      },
    });
  });

  it("updates an existing remote draft instead of duplicating it", async () => {
    prismaMock.emailDraft.findUnique.mockResolvedValue(
      draftFixture({ providerDraftId: "gmail-draft-1" }),
    );
    usableEmailAccessTokenMock.mockResolvedValue({
      accessToken: "access-token",
      refreshed: null,
    });
    createOrUpdateGmailDraftMock.mockResolvedValue({ id: "gmail-draft-1" });

    await pushEmailDraftToMailbox("draft-1");

    expect(createOrUpdateGmailDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({ providerDraftId: "gmail-draft-1" }),
    );
  });

  it("stores the error message without throwing when Gmail rejects the request", async () => {
    prismaMock.emailDraft.findUnique.mockResolvedValue(draftFixture());
    usableEmailAccessTokenMock.mockResolvedValue({
      accessToken: "access-token",
      refreshed: null,
    });
    createOrUpdateGmailDraftMock.mockRejectedValue(
      new Error("Gmail no pudo guardar el borrador (403)."),
    );

    await expect(pushEmailDraftToMailbox("draft-1")).resolves.toBeUndefined();

    expect(prismaMock.emailDraft.update).toHaveBeenCalledWith({
      where: { id: "draft-1" },
      data: { pushError: "Gmail no pudo guardar el borrador (403)." },
    });
  });
});
