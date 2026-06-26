ALTER TYPE "CalendarMeetingStatus" ADD VALUE IF NOT EXISTS 'MINUTES_PENDING';
ALTER TYPE "CalendarMeetingStatus" ADD VALUE IF NOT EXISTS 'ANALYZED';

CREATE TYPE "CalendarMeetingArtifactType" AS ENUM ('TRANSCRIPT', 'RECORDING', 'SMART_NOTES');
CREATE TYPE "CalendarMeetingArtifactStatus" AS ENUM ('FOUND', 'IMPORTED', 'FAILED');

CREATE TABLE "CalendarMeetingArtifact" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "type" "CalendarMeetingArtifactType" NOT NULL,
    "status" "CalendarMeetingArtifactStatus" NOT NULL DEFAULT 'FOUND',
    "sourceName" TEXT NOT NULL,
    "exportUri" TEXT,
    "driveFileId" TEXT,
    "documentId" TEXT,
    "textContent" TEXT,
    "summary" TEXT,
    "lastError" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarMeetingArtifact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarMeetingArtifact_meetingId_sourceName_key" ON "CalendarMeetingArtifact"("meetingId", "sourceName");
CREATE INDEX "CalendarMeetingArtifact_meetingId_idx" ON "CalendarMeetingArtifact"("meetingId");
CREATE INDEX "CalendarMeetingArtifact_type_idx" ON "CalendarMeetingArtifact"("type");
CREATE INDEX "CalendarMeetingArtifact_status_idx" ON "CalendarMeetingArtifact"("status");

ALTER TABLE "CalendarMeetingArtifact" ADD CONSTRAINT "CalendarMeetingArtifact_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CalendarMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
