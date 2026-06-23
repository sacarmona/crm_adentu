-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COMERCIAL', 'LECTURA');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('UNQUALIFIED', 'PROSPECTING', 'HISTORIC_CLIENT', 'ACTIVE_CLIENT', 'LOST', 'DISCARDED');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('UNQUALIFIED', 'QUALIFIED_POSITIVE', 'WITH_OPPORTUNITY', 'CLIENT', 'LOST', 'QUALIFIED_NEGATIVE');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('INBOUND_EMAIL', 'INBOUND_PHONE_WHATSAPP', 'INBOUND_OTHER', 'OUTBOUND_CONSULTATIVE', 'OUTBOUND_RELATIONAL', 'OUTBOUND_FAIRS', 'OUTBOUND_OTHER');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('EXPLORATION', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'STALLED', 'LOST');

-- CreateEnum
CREATE TYPE "Certainty" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CLP', 'UF', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('EMAIL', 'WHATSAPP', 'PHONE', 'LINKEDIN', 'NEW_FOCUS_CLIENT_MEETING', 'ONLINE_MEETING', 'IN_PERSON_MEETING', 'PROPOSAL_SENT', 'FOLLOW_UP', 'CLIENT_RESPONSE', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'EXECUTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AiInsightType" AS ENUM ('INTERACTION_ANALYSIS', 'NEXT_ACTION_SUGGESTION', 'FOLLOW_UP_EMAIL', 'COMPANY_HISTORY_SUMMARY', 'DORMANT_OPPORTUNITY_DETECTION', 'INCOMPLETE_COMPANY_DETECTION', 'CONTACT_WITHOUT_FOLLOW_UP_DETECTION');

-- CreateEnum
CREATE TYPE "AiInsightStatus" AS ENUM ('DRAFT', 'PROPOSED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CommercialSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('DRAFT', 'VALIDATING', 'READY', 'IMPORTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('PENDING', 'VALID', 'WARNING', 'ERROR', 'IMPORTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'STAGE_CHANGE', 'SOFT_DELETE', 'IMPORT', 'AI_SUGGESTION_APPROVAL');

-- CreateEnum
CREATE TYPE "AttachmentEntityType" AS ENUM ('COMPANY', 'CONTACT', 'OPPORTUNITY', 'INTERACTION', 'TASK', 'PLAYBOOK');

-- CreateEnum
CREATE TYPE "PlaybookItemType" AS ENUM ('KEY_QUESTION', 'QUALIFICATION_CRITERIA', 'COMMON_OBJECTION', 'SUGGESTED_NEXT_STEP', 'PROPOSAL_CHECKLIST', 'SUGGESTED_DOCUMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'COMERCIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "industry" TEXT,
    "region" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'UNQUALIFIED',
    "size" TEXT,
    "responsibleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastInteraction" TIMESTAMP(3),
    "activeDeals" INTEGER NOT NULL DEFAULT 0,
    "totalWon" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT,
    "roleArea" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'UNQUALIFIED',
    "email" TEXT,
    "phone" TEXT,
    "leadSource" "LeadSource",
    "responsibleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastInteraction" TIMESTAMP(3),
    "activeDeals" INTEGER NOT NULL DEFAULT 0,
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryContactId" TEXT,
    "companyId" TEXT,
    "serviceId" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'EXPLORATION',
    "certainty" "Certainty",
    "probability" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "ageDays" INTEGER NOT NULL DEFAULT 0,
    "businessUnit" TEXT,
    "currency" "Currency" NOT NULL DEFAULT 'CLP',
    "price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "priceClp" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "monthlyAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "months" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "weightedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "estimatedCloseDate" TIMESTAMP(3),
    "estimatedStartDate" TIMESTAMP(3),
    "nextActionDate" TIMESTAMP(3),
    "responsibleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastInteraction" TIMESTAMP(3),
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "companyId" TEXT,
    "executedById" TEXT,
    "type" "InteractionType" NOT NULL,
    "content" TEXT NOT NULL,
    "nextAction" TEXT,
    "nextActionDate" TIMESTAMP(3),
    "nextActionDueDate" TIMESTAMP(3),
    "nextActionStatus" "TaskStatus",
    "serviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "result" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "interactionId" TEXT,
    "serviceId" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketAsset" (
    "id" TEXT NOT NULL,
    "ownerName" TEXT,
    "unitName" TEXT NOT NULL,
    "serviceId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "constructionCompany" TEXT,
    "operationMaintenance" TEXT,
    "otherRole" TEXT,
    "comment" TEXT,
    "ownerCompanyId" TEXT,
    "constructionCompanyId" TEXT,
    "omCompanyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MarketAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialMilestone" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "project" TEXT NOT NULL,
    "industry" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommercialMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DictionaryValue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DictionaryValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceId" TEXT,
    "description" TEXT,
    "createdById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookItem" (
    "id" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "type" "PlaybookItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PlaybookItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInsight" (
    "id" TEXT NOT NULL,
    "type" "AiInsightType" NOT NULL,
    "status" "AiInsightStatus" NOT NULL DEFAULT 'PROPOSED',
    "interactionId" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "summary" TEXT,
    "customerInterests" JSONB,
    "objections" JSONB,
    "commitments" JSONB,
    "risks" JSONB,
    "suggestedNextSteps" JSONB,
    "mentionedServices" JSONB,
    "sentiment" "CommercialSentiment",
    "suggestedAdvanceProbability" DECIMAL(5,4),
    "suggestedChanges" JSONB,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'excel',
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "importedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "targetModel" TEXT NOT NULL,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "rawData" JSONB NOT NULL,
    "normalizedData" JSONB,
    "issues" JSONB,
    "createdEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "url" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "entityType" "AttachmentEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "companyId" TEXT,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "interactionId" TEXT,
    "playbookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_normalizedName_idx" ON "Company"("normalizedName");

-- CreateIndex
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- CreateIndex
CREATE INDEX "Company_industry_idx" ON "Company"("industry");

-- CreateIndex
CREATE INDEX "Company_region_idx" ON "Company"("region");

-- CreateIndex
CREATE INDEX "Company_responsibleId_idx" ON "Company"("responsibleId");

-- CreateIndex
CREATE INDEX "Company_lastInteraction_idx" ON "Company"("lastInteraction");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "Contact_status_idx" ON "Contact"("status");

-- CreateIndex
CREATE INDEX "Contact_leadSource_idx" ON "Contact"("leadSource");

-- CreateIndex
CREATE INDEX "Contact_responsibleId_idx" ON "Contact"("responsibleId");

-- CreateIndex
CREATE INDEX "Contact_lastInteraction_idx" ON "Contact"("lastInteraction");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE INDEX "Opportunity_companyId_idx" ON "Opportunity"("companyId");

-- CreateIndex
CREATE INDEX "Opportunity_primaryContactId_idx" ON "Opportunity"("primaryContactId");

-- CreateIndex
CREATE INDEX "Opportunity_serviceId_idx" ON "Opportunity"("serviceId");

-- CreateIndex
CREATE INDEX "Opportunity_responsibleId_idx" ON "Opportunity"("responsibleId");

-- CreateIndex
CREATE INDEX "Opportunity_estimatedCloseDate_idx" ON "Opportunity"("estimatedCloseDate");

-- CreateIndex
CREATE INDEX "Opportunity_nextActionDate_idx" ON "Opportunity"("nextActionDate");

-- CreateIndex
CREATE INDEX "Opportunity_lastInteraction_idx" ON "Opportunity"("lastInteraction");

-- CreateIndex
CREATE INDEX "Interaction_companyId_idx" ON "Interaction"("companyId");

-- CreateIndex
CREATE INDEX "Interaction_contactId_idx" ON "Interaction"("contactId");

-- CreateIndex
CREATE INDEX "Interaction_opportunityId_idx" ON "Interaction"("opportunityId");

-- CreateIndex
CREATE INDEX "Interaction_date_idx" ON "Interaction"("date");

-- CreateIndex
CREATE INDEX "Interaction_executedById_idx" ON "Interaction"("executedById");

-- CreateIndex
CREATE INDEX "Interaction_serviceId_idx" ON "Interaction"("serviceId");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_companyId_idx" ON "Task"("companyId");

-- CreateIndex
CREATE INDEX "Task_opportunityId_idx" ON "Task"("opportunityId");

-- CreateIndex
CREATE INDEX "MarketAsset_serviceId_idx" ON "MarketAsset"("serviceId");

-- CreateIndex
CREATE INDEX "MarketAsset_ownerName_idx" ON "MarketAsset"("ownerName");

-- CreateIndex
CREATE INDEX "MarketAsset_constructionCompany_idx" ON "MarketAsset"("constructionCompany");

-- CreateIndex
CREATE INDEX "MarketAsset_operationMaintenance_idx" ON "MarketAsset"("operationMaintenance");

-- CreateIndex
CREATE INDEX "CommercialMilestone_date_idx" ON "CommercialMilestone"("date");

-- CreateIndex
CREATE INDEX "CommercialMilestone_companyId_idx" ON "CommercialMilestone"("companyId");

-- CreateIndex
CREATE INDEX "CommercialMilestone_industry_idx" ON "CommercialMilestone"("industry");

-- CreateIndex
CREATE UNIQUE INDEX "Service_name_key" ON "Service"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_slug_idx" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "Service"("isActive");

-- CreateIndex
CREATE INDEX "DictionaryValue_type_idx" ON "DictionaryValue"("type");

-- CreateIndex
CREATE INDEX "DictionaryValue_isActive_idx" ON "DictionaryValue"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DictionaryValue_type_key_key" ON "DictionaryValue"("type", "key");

-- CreateIndex
CREATE INDEX "Playbook_serviceId_idx" ON "Playbook"("serviceId");

-- CreateIndex
CREATE INDEX "Playbook_isActive_idx" ON "Playbook"("isActive");

-- CreateIndex
CREATE INDEX "PlaybookItem_playbookId_idx" ON "PlaybookItem"("playbookId");

-- CreateIndex
CREATE INDEX "PlaybookItem_type_idx" ON "PlaybookItem"("type");

-- CreateIndex
CREATE INDEX "AiInsight_type_idx" ON "AiInsight"("type");

-- CreateIndex
CREATE INDEX "AiInsight_status_idx" ON "AiInsight"("status");

-- CreateIndex
CREATE INDEX "AiInsight_interactionId_idx" ON "AiInsight"("interactionId");

-- CreateIndex
CREATE INDEX "AiInsight_companyId_idx" ON "AiInsight"("companyId");

-- CreateIndex
CREATE INDEX "AiInsight_contactId_idx" ON "AiInsight"("contactId");

-- CreateIndex
CREATE INDEX "AiInsight_opportunityId_idx" ON "AiInsight"("opportunityId");

-- CreateIndex
CREATE INDEX "ImportBatch_status_idx" ON "ImportBatch"("status");

-- CreateIndex
CREATE INDEX "ImportBatch_createdAt_idx" ON "ImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "ImportRow_importBatchId_idx" ON "ImportRow"("importBatchId");

-- CreateIndex
CREATE INDEX "ImportRow_sheetName_idx" ON "ImportRow"("sheetName");

-- CreateIndex
CREATE INDEX "ImportRow_targetModel_idx" ON "ImportRow"("targetModel");

-- CreateIndex
CREATE INDEX "ImportRow_status_idx" ON "ImportRow"("status");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Attachment_entityType_entityId_idx" ON "Attachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Attachment_companyId_idx" ON "Attachment"("companyId");

-- CreateIndex
CREATE INDEX "Attachment_contactId_idx" ON "Attachment"("contactId");

-- CreateIndex
CREATE INDEX "Attachment_opportunityId_idx" ON "Attachment"("opportunityId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketAsset" ADD CONSTRAINT "MarketAsset_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketAsset" ADD CONSTRAINT "MarketAsset_ownerCompanyId_fkey" FOREIGN KEY ("ownerCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketAsset" ADD CONSTRAINT "MarketAsset_constructionCompanyId_fkey" FOREIGN KEY ("constructionCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketAsset" ADD CONSTRAINT "MarketAsset_omCompanyId_fkey" FOREIGN KEY ("omCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialMilestone" ADD CONSTRAINT "CommercialMilestone_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialMilestone" ADD CONSTRAINT "CommercialMilestone_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookItem" ADD CONSTRAINT "PlaybookItem_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE SET NULL ON UPDATE CASCADE;
