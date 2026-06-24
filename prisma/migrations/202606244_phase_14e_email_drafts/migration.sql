CREATE TYPE "EmailDraftStatus" AS ENUM ('DRAFT', 'APPROVED', 'DISCARDED');

CREATE TABLE "EmailDraft" (
    "id" TEXT NOT NULL,
    "emailMessageId" TEXT NOT NULL,
    "status" "EmailDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailDraft_emailMessageId_key" ON "EmailDraft"("emailMessageId");
CREATE INDEX "EmailDraft_status_idx" ON "EmailDraft"("status");
CREATE INDEX "EmailDraft_reviewedById_idx" ON "EmailDraft"("reviewedById");

ALTER TABLE "EmailDraft" ADD CONSTRAINT "EmailDraft_emailMessageId_fkey"
FOREIGN KEY ("emailMessageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailDraft" ADD CONSTRAINT "EmailDraft_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
