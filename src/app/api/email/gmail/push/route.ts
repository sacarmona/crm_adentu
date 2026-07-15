import { NextRequest, NextResponse } from "next/server";

import {
  handleGmailPubSubPush,
  isAuthorizedGmailPushRequest,
} from "@/server/services/gmail-push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (
    !isAuthorizedGmailPushRequest({
      tokenFromQuery: request.nextUrl.searchParams.get("token"),
      tokenFromHeader: request.headers.get("x-gmail-push-token"),
    })
  ) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await handleGmailPubSubPush(await request.json());
    return NextResponse.json({
      status: result.results.some((item) => item.status === "failed")
        ? "partial"
        : "ok",
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "failed",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 },
    );
  }
}
