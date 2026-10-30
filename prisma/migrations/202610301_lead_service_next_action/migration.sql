-- AlterTable: Lead - servicio y proxima accion
ALTER TABLE "Lead" ADD COLUMN "serviceId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "nextAction" TEXT;
ALTER TABLE "Lead" ADD COLUMN "nextActionDate" TIMESTAMP(3);

-- AlterTable: Task - vinculo a Lead
ALTER TABLE "Task" ADD COLUMN "leadId" TEXT;

-- CreateIndex
CREATE INDEX "Lead_serviceId_idx" ON "Lead"("serviceId");
CREATE INDEX "Task_leadId_idx" ON "Task"("leadId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
