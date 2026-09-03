-- CreateEnum
CREATE TYPE "OpportunityClosurePhase" AS ENUM ('VIGENTE', 'FINALIZADA');

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN "closurePhase" "OpportunityClosurePhase";

-- CreateIndex
CREATE INDEX "Opportunity_closurePhase_idx" ON "Opportunity"("closurePhase");

-- Backfill: todas las oportunidades cerradas (ganadas o perdidas) existentes
-- se marcan como FINALIZADA. Las abiertas quedan en NULL (no aplica).
UPDATE "Opportunity"
SET "closurePhase" = 'FINALIZADA'
WHERE "status" IN ('WON', 'LOST') AND "deletedAt" IS NULL AND "closurePhase" IS NULL;
