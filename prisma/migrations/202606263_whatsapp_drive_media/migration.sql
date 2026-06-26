ALTER TABLE "WhatsAppMessage" ADD COLUMN "mediaUrl" TEXT;
ALTER TABLE "WhatsAppMessage" ADD COLUMN "mediaError" TEXT;

CREATE TABLE "WhatsAppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "mediaUploaderUserId" TEXT,
    "rootFolderId" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppMediaFolder" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "driveFolderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMediaFolder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppMediaFolder_phoneNumber_key" ON "WhatsAppMediaFolder"("phoneNumber");

ALTER TABLE "WhatsAppSettings" ADD CONSTRAINT "WhatsAppSettings_mediaUploaderUserId_fkey" FOREIGN KEY ("mediaUploaderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsAppSettings" ADD CONSTRAINT "WhatsAppSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
