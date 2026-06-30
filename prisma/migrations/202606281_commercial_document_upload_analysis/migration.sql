ALTER TABLE "CommercialDocument"
ADD COLUMN "documentNumber" TEXT,
ADD COLUMN "documentDate" TIMESTAMP(3),
ADD COLUMN "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
ADD COLUMN "amountClp" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "exchangeRateDate" TIMESTAMP(3),
ADD COLUMN "exchangeRateSource" TEXT,
ADD COLUMN "driveFileId" TEXT,
ADD COLUMN "fileName" TEXT,
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "analysisSummary" TEXT;

CREATE INDEX "CommercialDocument_documentNumber_idx" ON "CommercialDocument"("documentNumber");
