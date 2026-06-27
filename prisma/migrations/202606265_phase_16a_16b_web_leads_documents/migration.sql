CREATE TYPE "WebLeadStatus" AS ENUM ('PENDING', 'CONVERTED', 'DISCARDED');
CREATE TYPE "CommercialDocumentType" AS ENUM ('QUOTE', 'PROPOSAL', 'CONTRACT');
CREATE TYPE "CommercialDocumentStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "WebLead" (
  "id" TEXT NOT NULL,
  "externalId" TEXT,
  "status" "WebLeadStatus" NOT NULL DEFAULT 'PENDING',
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "companyName" TEXT,
  "roleArea" TEXT,
  "subject" TEXT,
  "message" TEXT NOT NULL,
  "sourcePage" TEXT,
  "campaignSource" TEXT,
  "campaignMedium" TEXT,
  "campaignName" TEXT,
  "consent" BOOLEAN NOT NULL DEFAULT false,
  "rawPayload" JSONB,
  "companyId" TEXT,
  "contactId" TEXT,
  "opportunityId" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "discardReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialDocument" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "type" "CommercialDocumentType" NOT NULL,
  "status" "CommercialDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "currency" "Currency" NOT NULL DEFAULT 'CLP',
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "documentUrl" TEXT,
  "sentAt" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CommercialDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebLead_externalId_key" ON "WebLead"("externalId");
CREATE INDEX "WebLead_status_createdAt_idx" ON "WebLead"("status", "createdAt");
CREATE INDEX "WebLead_email_idx" ON "WebLead"("email");
CREATE INDEX "WebLead_companyId_idx" ON "WebLead"("companyId");
CREATE INDEX "WebLead_opportunityId_idx" ON "WebLead"("opportunityId");
CREATE UNIQUE INDEX "CommercialDocument_opportunityId_type_version_key" ON "CommercialDocument"("opportunityId", "type", "version");
CREATE INDEX "CommercialDocument_opportunityId_status_idx" ON "CommercialDocument"("opportunityId", "status");
CREATE INDEX "CommercialDocument_validUntil_idx" ON "CommercialDocument"("validUntil");

ALTER TABLE "WebLead" ADD CONSTRAINT "WebLead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebLead" ADD CONSTRAINT "WebLead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebLead" ADD CONSTRAINT "WebLead_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebLead" ADD CONSTRAINT "WebLead_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialDocument" ADD CONSTRAINT "CommercialDocument_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialDocument" ADD CONSTRAINT "CommercialDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
