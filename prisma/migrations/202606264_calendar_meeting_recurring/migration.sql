-- AlterTable
ALTER TABLE "CalendarMeeting" ADD COLUMN "recurringEventId" TEXT;
ALTER TABLE "CalendarMeeting" ADD COLUMN "discardRuleId" TEXT;

-- CreateTable
CREATE TABLE "CalendarMeetingDiscardRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recurringEventId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarMeetingDiscardRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarMeeting_recurringEventId_idx" ON "CalendarMeeting"("recurringEventId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarMeetingDiscardRule_userId_recurringEventId_key" ON "CalendarMeetingDiscardRule"("userId", "recurringEventId");

-- CreateIndex
CREATE INDEX "CalendarMeetingDiscardRule_isActive_idx" ON "CalendarMeetingDiscardRule"("isActive");

-- AddForeignKey
ALTER TABLE "CalendarMeeting" ADD CONSTRAINT "CalendarMeeting_discardRuleId_fkey" FOREIGN KEY ("discardRuleId") REFERENCES "CalendarMeetingDiscardRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarMeetingDiscardRule" ADD CONSTRAINT "CalendarMeetingDiscardRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
