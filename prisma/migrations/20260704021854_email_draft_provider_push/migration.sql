-- AlterTable
ALTER TABLE "EmailDraft" ADD COLUMN     "providerDraftId" TEXT,
ADD COLUMN     "pushError" TEXT,
ADD COLUMN     "pushedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EmailMessage" ADD COLUMN     "messageIdHeader" TEXT;
