import { AuditAction, EmailProvider } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/server/authorization-policy";
import {
  emailAddressForToken,
  exchangeEmailAuthorizationCode,
} from "@/server/services/email-providers";
import { verifyEmailOAuthState } from "@/server/services/email-oauth-state";

function providerSlug(provider: EmailProvider) {
  return provider === EmailProvider.GMAIL ? "gmail" : "microsoft";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  const code = request.nextUrl.searchParams.get("code");
  const stateValue = request.nextUrl.searchParams.get("state");

  try {
    if (
      !session?.user ||
      !canWrite(session.user.role) ||
      !code ||
      !stateValue
    ) {
      throw new Error("La respuesta OAuth esta incompleta.");
    }

    const state = verifyEmailOAuthState(stateValue);
    if (
      state.userId !== session.user.id ||
      providerSlug(state.provider) !== (await params).provider
    ) {
      throw new Error("La respuesta OAuth no corresponde al usuario actual.");
    }

    const redirectUri = `${request.nextUrl.origin}/api/email/oauth/${providerSlug(state.provider)}/callback`;
    const token = await exchangeEmailAuthorizationCode({
      provider: state.provider,
      code,
      redirectUri,
    });
    const emailAddress = await emailAddressForToken(
      state.provider,
      token.accessToken,
    );

    const connection = await prisma.emailConnection.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: state.provider,
        },
      },
      create: {
        userId: session.user.id,
        provider: state.provider,
        emailAddress,
        accessTokenEncrypted: token.accessTokenEncrypted,
        refreshTokenEncrypted: token.refreshTokenEncrypted,
        tokenExpiresAt: token.tokenExpiresAt,
        scope: token.scope,
      },
      update: {
        emailAddress,
        accessTokenEncrypted: token.accessTokenEncrypted,
        ...(token.refreshTokenEncrypted
          ? { refreshTokenEncrypted: token.refreshTokenEncrypted }
          : {}),
        tokenExpiresAt: token.tokenExpiresAt,
        scope: token.scope,
        lastError: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "EmailConnection",
        entityId: connection.id,
        actorId: session.user.id,
        after: { provider: connection.provider, emailAddress },
      },
    });

    return NextResponse.redirect(new URL("/email?connected=1", request.url));
  } catch {
    return NextResponse.redirect(new URL("/email?error=oauth", request.url));
  }
}
