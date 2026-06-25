import { AuditAction } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/server/authorization-policy";
import { verifyCalendarOAuthState } from "@/server/services/calendar-oauth-state";
import {
  emailAddressForCalendarToken,
  exchangeCalendarAuthorizationCode,
} from "@/server/services/google-calendar";

export async function GET(request: NextRequest) {
  const session = await auth();
  const code = request.nextUrl.searchParams.get("code");
  const stateValue = request.nextUrl.searchParams.get("state");

  try {
    if (!session?.user || !canWrite(session.user.role) || !code || !stateValue) {
      throw new Error("La respuesta OAuth esta incompleta.");
    }

    const state = verifyCalendarOAuthState(stateValue);
    if (state.userId !== session.user.id) {
      throw new Error("La respuesta OAuth no corresponde al usuario actual.");
    }

    const redirectUri = `${request.nextUrl.origin}/api/calendar/oauth/google/callback`;
    const token = await exchangeCalendarAuthorizationCode({ code, redirectUri });
    const emailAddress = await emailAddressForCalendarToken(token.accessToken);

    const connection = await prisma.calendarConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
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
        entityType: "CalendarConnection",
        entityId: connection.id,
        actorId: session.user.id,
        after: { emailAddress },
      },
    });

    return NextResponse.redirect(new URL("/settings?calendarConnected=1", request.url));
  } catch {
    return NextResponse.redirect(new URL("/settings?calendarError=oauth", request.url));
  }
}
