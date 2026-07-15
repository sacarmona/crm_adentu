import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { classifyPendingEmails } from "@/server/services/email-agent";
import { isActiveProviderConfigured } from "@/server/services/ai-provider";
import { isAuthorizedCronRequest } from "@/server/services/email-automation";
import { synchronizeEmailConnection } from "@/server/services/email-sync";
import { renewGmailWatches } from "@/server/services/gmail-push";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (
    !isAuthorizedCronRequest({
      authorizationHeader: request.headers.get("authorization"),
      cronSecret: env.CRON_SECRET,
    })
  ) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  const connections = await prisma.emailConnection.findMany({
    select: { id: true, userId: true, emailAddress: true },
    orderBy: { createdAt: "asc" },
  });
  const syncResults = [];
  for (const connection of connections) {
    try {
      const messages = await synchronizeEmailConnection(
        connection.id,
        connection.userId,
      );
      syncResults.push({
        connectionId: connection.id,
        mailbox: connection.emailAddress,
        status: "synced" as const,
        messages,
      });
    } catch (error) {
      syncResults.push({
        connectionId: connection.id,
        mailbox: connection.emailAddress,
        status: "failed" as const,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  const gmailWatchRenewal = await renewGmailWatches();

  const classificationResults = [];
  const shouldClassify =
    env.EMAIL_AUTO_CLASSIFY === "true" &&
    (await isActiveProviderConfigured());
  if (shouldClassify) {
    for (const userId of [...new Set(connections.map((item) => item.userId))]) {
      classificationResults.push({
        userId,
        results: await classifyPendingEmails({
          userId,
          limit: env.EMAIL_AUTO_CLASSIFY_LIMIT,
          enforceHourlyLimit: false,
        }),
      });
    }
  }

  return NextResponse.json({
    status: syncResults.some((item) => item.status === "failed")
      ? "partial"
      : "ok",
    synchronizedConnections: syncResults,
    gmailWatchRenewal,
    automaticClassification: shouldClassify,
    classifications: classificationResults,
    timestamp: new Date().toISOString(),
  });
}
