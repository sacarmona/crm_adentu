import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { isAuthorizedCronRequest } from "@/server/services/email-automation";
import { finalizeStalledOpportunities } from "@/server/services/stalled-sweep";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  if (
    !isAuthorizedCronRequest({
      authorizationHeader: request.headers.get("authorization"),
      cronSecret: env.CRON_SECRET,
    })
  ) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  const result = await finalizeStalledOpportunities();

  return NextResponse.json({
    status: "ok",
    ...result,
    timestamp: new Date().toISOString(),
  });
}
