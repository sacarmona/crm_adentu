CREATE TYPE "EmailDiscardRuleType" AS ENUM (
  'SENDER_EXACT',
  'SENDER_DOMAIN',
  'SUBJECT_CONTAINS'
);

CREATE TABLE "EmailDiscardRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EmailDiscardRuleType" NOT NULL,
    "value" TEXT NOT NULL,
    "direction" "EmailDirection",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDiscardRule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EmailClassification" ADD COLUMN "discardRuleId" TEXT;

CREATE UNIQUE INDEX "EmailDiscardRule_userId_type_value_direction_key"
ON "EmailDiscardRule"("userId", "type", "value", "direction");
CREATE INDEX "EmailDiscardRule_userId_isActive_idx"
ON "EmailDiscardRule"("userId", "isActive");
CREATE INDEX "EmailDiscardRule_type_idx" ON "EmailDiscardRule"("type");
CREATE INDEX "EmailClassification_discardRuleId_idx"
ON "EmailClassification"("discardRuleId");

ALTER TABLE "EmailDiscardRule" ADD CONSTRAINT "EmailDiscardRule_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailClassification" ADD CONSTRAINT "EmailClassification_discardRuleId_fkey"
FOREIGN KEY ("discardRuleId") REFERENCES "EmailDiscardRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
