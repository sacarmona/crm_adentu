CREATE TYPE "EmailProvider" AS ENUM ('GMAIL', 'MICROSOFT');
CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TABLE "EmailConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "syncCursor" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "threadId" TEXT,
    "direction" "EmailDirection" NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "toAddresses" JSONB NOT NULL,
    "ccAddresses" JSONB,
    "subject" TEXT,
    "snippet" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "interactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailConnection_userId_provider_key" ON "EmailConnection"("userId", "provider");
CREATE INDEX "EmailConnection_emailAddress_idx" ON "EmailConnection"("emailAddress");
CREATE UNIQUE INDEX "EmailMessage_connectionId_providerMessageId_key" ON "EmailMessage"("connectionId", "providerMessageId");
CREATE INDEX "EmailMessage_sentAt_idx" ON "EmailMessage"("sentAt");
CREATE INDEX "EmailMessage_fromAddress_idx" ON "EmailMessage"("fromAddress");
CREATE INDEX "EmailMessage_interactionId_idx" ON "EmailMessage"("interactionId");

ALTER TABLE "EmailConnection" ADD CONSTRAINT "EmailConnection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "EmailConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_interactionId_fkey"
FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
