import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  deploymentReadiness,
  missingProductionVariables,
} from "@/server/services/runtime-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const missingVariables = missingProductionVariables(env);
  let databaseConnected = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseConnected = true;
  } catch {
    databaseConnected = false;
  }

  const ready = deploymentReadiness({
    missingVariables,
    databaseConnected,
  });

  return NextResponse.json(
    {
      status: ready ? "ok" : "degraded",
      database: databaseConnected ? "connected" : "unavailable",
      configuration: missingVariables.length === 0 ? "complete" : "incomplete",
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 },
  );
}
