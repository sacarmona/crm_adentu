CREATE TYPE "EmailClassificationStatus" AS ENUM ('PROPOSED', 'APPROVED', 'IGNORED');
CREATE TYPE "EmailCommercialIntent" AS ENUM (
  'INQUIRY',
  'OPPORTUNITY',
  'FOLLOW_UP',
  'PROPOSAL',
  'NEGOTIATION',
  'SUPPORT',
  'ADMINISTRATIVE',
  'OTHER'
);

CREATE TABLE "EmailClassification" (
    "id" TEXT NOT NULL,
    "emailMessageId" TEXT NOT NULL,
    "status" "EmailClassificationStatus" NOT NULL DEFAULT 'PROPOSED',
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
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailClassification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailClassification_emailMessageId_key" ON "EmailClassification"("emailMessageId");
CREATE INDEX "EmailClassification_status_idx" ON "EmailClassification"("status");
CREATE INDEX "EmailClassification_isCommercial_idx" ON "EmailClassification"("isCommercial");
CREATE INDEX "EmailClassification_matchedContactId_idx" ON "EmailClassification"("matchedContactId");
CREATE INDEX "EmailClassification_matchedCompanyId_idx" ON "EmailClassification"("matchedCompanyId");
CREATE INDEX "EmailClassification_matchedOpportunityId_idx" ON "EmailClassification"("matchedOpportunityId");

ALTER TABLE "EmailClassification" ADD CONSTRAINT "EmailClassification_emailMessageId_fkey"
FOREIGN KEY ("emailMessageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailClassification" ADD CONSTRAINT "EmailClassification_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
