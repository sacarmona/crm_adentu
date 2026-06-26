ALTER TABLE "Task"
ADD COLUMN "googleTaskOwnerId" TEXT,
ADD COLUMN "googleTaskListId" TEXT,
ADD COLUMN "googleTaskId" TEXT,
ADD COLUMN "googleTaskUpdatedAt" TIMESTAMP(3),
ADD COLUMN "googleTaskSyncedAt" TIMESTAMP(3),
ADD COLUMN "googleTaskWebUrl" TEXT;

CREATE INDEX "Task_googleTaskOwnerId_idx" ON "Task"("googleTaskOwnerId");
CREATE UNIQUE INDEX "Task_googleTaskOwnerId_googleTaskListId_googleTaskId_key" ON "Task"("googleTaskOwnerId", "googleTaskListId", "googleTaskId");
