-- CreateTable
CREATE TABLE "EmailMessageTombstone" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessageTombstone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessageTombstone_connectionId_providerMessageId_key" ON "EmailMessageTombstone"("connectionId", "providerMessageId");

-- CreateIndex
CREATE INDEX "EmailMessageTombstone_connectionId_idx" ON "EmailMessageTombstone"("connectionId");
