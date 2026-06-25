import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { canWrite } from "@/server/authorization-policy";
import { createCalendarOAuthState } from "@/server/services/calendar-oauth-state";
import { calendarAuthorizationUrl, isGoogleCalendarConfigured } from "@/server/services/google-calendar";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!canWrite(session.user.role)) {
    return NextResponse.redirect(new URL("/settings?calendarError=permission", request.url));
  }
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(new URL("/settings?calendarError=provider", request.url));
  }

  const redirectUri = `${request.nextUrl.origin}/api/calendar/oauth/google/callback`;
  const state = createCalendarOAuthState({ userId: session.user.id });

  return NextResponse.redirect(calendarAuthorizationUrl({ redirectUri, state }));
}
