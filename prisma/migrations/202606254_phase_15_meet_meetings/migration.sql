CREATE TYPE "CalendarMeetingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'IMPORTED', 'IGNORED');

CREATE TABLE "CalendarMeeting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "meetingUri" TEXT,
    "conferenceId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "attendees" JSONB,
    "organizerEmail" TEXT,
    "status" "CalendarMeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "minutes" TEXT,
    "importedInteractionId" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "serviceId" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarMeeting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarMeeting_userId_providerEventId_key" ON "CalendarMeeting"("userId", "providerEventId");
CREATE UNIQUE INDEX "CalendarMeeting_importedInteractionId_key" ON "CalendarMeeting"("importedInteractionId");
CREATE INDEX "CalendarMeeting_startsAt_idx" ON "CalendarMeeting"("startsAt");
CREATE INDEX "CalendarMeeting_status_idx" ON "CalendarMeeting"("status");
CREATE INDEX "CalendarMeeting_companyId_idx" ON "CalendarMeeting"("companyId");
CREATE INDEX "CalendarMeeting_contactId_idx" ON "CalendarMeeting"("contactId");
CREATE INDEX "CalendarMeeting_opportunityId_idx" ON "CalendarMeeting"("opportunityId");

ALTER TABLE "CalendarMeeting" ADD CONSTRAINT "CalendarMeeting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarMeeting" ADD CONSTRAINT "CalendarMeeting_importedInteractionId_fkey" FOREIGN KEY ("importedInteractionId") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarMeeting" ADD CONSTRAINT "CalendarMeeting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarMeeting" ADD CONSTRAINT "CalendarMeeting_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarMeeting" ADD CONSTRAINT "CalendarMeeting_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarMeeting" ADD CONSTRAINT "CalendarMeeting_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
