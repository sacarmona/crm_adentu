-- CreateTable
CREATE TABLE "WhatsAppDiscardRule" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppDiscardRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppThreadAnalysis" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "isCommercial" BOOLEAN NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "summary" TEXT NOT NULL,
    "intent" "EmailCommercialIntent" NOT NULL,
    "sentiment" "CommercialSentiment" NOT NULL,
    "suggestedNextAction" TEXT,
    "suggestedDueDate" TIMESTAMP(3),
    "matchedContactId" TEXT,
    "matchedCompanyId" TEXT,
    "matchedOpportunityId" TEXT,
    "taskCreatedId" TEXT,
    "analyzedById" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppThreadAnalysis_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "WhatsAppMessage" ADD COLUMN "discardRuleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppDiscardRule_phoneNumber_key" ON "WhatsAppDiscardRule"("phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppDiscardRule_isActive_idx" ON "WhatsAppDiscardRule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppThreadAnalysis_phoneNumber_key" ON "WhatsAppThreadAnalysis"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppThreadAnalysis_taskCreatedId_key" ON "WhatsAppThreadAnalysis"("taskCreatedId");

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_discardRuleId_fkey" FOREIGN KEY ("discardRuleId") REFERENCES "WhatsAppDiscardRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppDiscardRule" ADD CONSTRAINT "WhatsAppDiscardRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppThreadAnalysis" ADD CONSTRAINT "WhatsAppThreadAnalysis_analyzedById_fkey" FOREIGN KEY ("analyzedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppThreadAnalysis" ADD CONSTRAINT "WhatsAppThreadAnalysis_taskCreatedId_fkey" FOREIGN KEY ("taskCreatedId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
