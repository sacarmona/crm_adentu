-- CreateEnum
CREATE TYPE "ContactMedium" AS ENUM ('TELEFONO', 'WHATSAPP', 'EMAIL', 'LINKEDIN', 'PRESENCIAL', 'OTRO');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NUEVO', 'CONTACTADO', 'CALIFICADO', 'CONVERTIDO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "medium" "ContactMedium" NOT NULL DEFAULT 'TELEFONO',
    "status" "LeadStatus" NOT NULL DEFAULT 'NUEVO',
    "notes" TEXT,
    "lastContactAt" TIMESTAMP(3),
    "responsibleId" TEXT,
    "createdById" TEXT,
    "convertedOpportunityId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadContactLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "medium" "ContactMedium" NOT NULL,
    "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadContactLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_responsibleId_idx" ON "Lead"("responsibleId");

-- CreateIndex
CREATE INDEX "Lead_deletedAt_idx" ON "Lead"("deletedAt");

-- CreateIndex
CREATE INDEX "Lead_lastContactAt_idx" ON "Lead"("lastContactAt");

-- CreateIndex
CREATE INDEX "LeadContactLog_leadId_idx" ON "LeadContactLog"("leadId");

-- AddForeignKey
ALTER TABLE "LeadContactLog" ADD CONSTRAINT "LeadContactLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
