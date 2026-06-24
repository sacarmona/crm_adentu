import { EmailProvider } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { canWrite } from "@/server/authorization-policy";
import {
  emailOAuthAuthorizationUrl,
  isEmailProviderConfigured,
} from "@/server/services/email-providers";
import { createEmailOAuthState } from "@/server/services/email-oauth-state";

function providerFromParam(value: string) {
  if (value === "gmail") return EmailProvider.GMAIL;
  if (value === "microsoft") return EmailProvider.MICROSOFT;
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!canWrite(session.user.role)) {
    return NextResponse.redirect(new URL("/email?error=permission", request.url));
  }

  const provider = providerFromParam((await params).provider);
  if (!provider || !isEmailProviderConfigured(provider)) {
    return NextResponse.redirect(new URL("/email?error=provider", request.url));
  }

  const providerSlug = provider === EmailProvider.GMAIL ? "gmail" : "microsoft";
  const redirectUri = `${request.nextUrl.origin}/api/email/oauth/${providerSlug}/callback`;
  const state = createEmailOAuthState({ userId: session.user.id, provider });

  return NextResponse.redirect(
    emailOAuthAuthorizationUrl({ provider, redirectUri, state }),
  );
}
