-- AlterTable
ALTER TABLE "Task" ADD COLUMN "calendarEventId" TEXT,
ADD COLUMN "calendarOwnerId" TEXT,
ADD COLUMN "calendarSyncedAt" TIMESTAMP(3),
ADD COLUMN "calendarError" TEXT;

-- CreateTable
CREATE TABLE "CalendarConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarConnection_userId_key" ON "CalendarConnection"("userId");

-- AddForeignKey
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
