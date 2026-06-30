import { prisma } from "@/lib/prisma";
import { ensureDriveFolder, googleDriveScopesGranted, uploadFileToDrive } from "@/server/services/google-drive";
import { usableCalendarAccessToken } from "@/server/services/google-calendar";

export async function storeCommercialDocument(input: { userId: string; opportunityName: string; fileName: string; mimeType: string; data: Buffer }) {
  const connection = await prisma.calendarConnection.findUnique({ where: { userId: input.userId } });
  if (!connection || !googleDriveScopesGranted(connection.scope)) {
    throw new Error("Conecta Google Calendar/Drive con permiso de archivos antes de subir documentos.");
  }
  const { accessToken, refreshed } = await usableCalendarAccessToken(connection);
  if (refreshed) {
    await prisma.calendarConnection.update({ where: { id: connection.id }, data: { accessTokenEncrypted: refreshed.accessTokenEncrypted, tokenExpiresAt: refreshed.tokenExpiresAt } });
  }
  const rootId = await ensureDriveFolder(accessToken, { name: "CRM ADENTU" });
  const documentsId = await ensureDriveFolder(accessToken, { name: "Documentos comerciales", parentId: rootId });
  const opportunityId = await ensureDriveFolder(accessToken, { name: input.opportunityName.slice(0, 180), parentId: documentsId });
  return uploadFileToDrive(accessToken, { folderId: opportunityId, name: input.fileName, mimeType: input.mimeType, data: input.data });
}
