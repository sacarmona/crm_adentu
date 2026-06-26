import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { ensureDriveFolder, uploadFileToDrive } from "@/server/services/google-drive";
import { usableCalendarAccessToken } from "@/server/services/google-calendar";

const ROOT_FOLDER_NAME = "WhatsApp CRM";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "video/mp4": "mp4",
};

async function uploaderAccessToken() {
  const settings = await prisma.whatsAppSettings.findUnique({ where: { id: "default" } });
  if (!settings?.mediaUploaderUserId) return null;

  const connection = await prisma.calendarConnection.findUnique({
    where: { userId: settings.mediaUploaderUserId },
  });
  if (!connection) return null;

  const { accessToken, refreshed } = await usableCalendarAccessToken(connection);
  if (refreshed) {
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: {
        accessTokenEncrypted: refreshed.accessTokenEncrypted,
        tokenExpiresAt: refreshed.tokenExpiresAt,
      },
    });
  }
  return accessToken;
}

async function rootFolderId(driveAccessToken: string) {
  const settings = await prisma.whatsAppSettings.findUnique({ where: { id: "default" } });
  if (settings?.rootFolderId) return settings.rootFolderId;

  const folderId = await ensureDriveFolder(driveAccessToken, { name: ROOT_FOLDER_NAME });
  await prisma.whatsAppSettings.update({
    where: { id: "default" },
    data: { rootFolderId: folderId },
  });
  return folderId;
}

async function folderForPhone(driveAccessToken: string, phoneNumber: string) {
  const existing = await prisma.whatsAppMediaFolder.findUnique({ where: { phoneNumber } });
  if (existing) return existing.driveFolderId;

  const parentId = await rootFolderId(driveAccessToken);
  const folderId = await ensureDriveFolder(driveAccessToken, { name: phoneNumber, parentId });
  await prisma.whatsAppMediaFolder.create({ data: { phoneNumber, driveFolderId: folderId } });
  return folderId;
}

async function resolveMetaMediaUrl(mediaId: string) {
  const response = await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Meta rechazo la resolucion del archivo (${response.status}).`);
  }
  return (await response.json()) as { url?: string; mime_type?: string; file_size?: number };
}

async function downloadMetaMedia(url: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Meta rechazo la descarga del archivo (${response.status}).`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function fetchAndStoreWhatsAppMedia(input: {
  mediaId: string;
  mediaType: string;
  phoneNumber: string;
}): Promise<{ mediaUrl?: string; mediaError?: string }> {
  try {
    const driveAccessToken = await uploaderAccessToken();
    if (!driveAccessToken) {
      return { mediaError: "No hay un usuario de Drive configurado para guardar archivos de WhatsApp." };
    }

    const meta = await resolveMetaMediaUrl(input.mediaId);
    if (!meta.url) {
      return { mediaError: "Meta no devolvio una URL de descarga para este archivo." };
    }

    const data = await downloadMetaMedia(meta.url);
    const mimeType = meta.mime_type ?? "application/octet-stream";
    const extension = EXTENSION_BY_MIME[mimeType] ?? input.mediaType;
    const folderId = await folderForPhone(driveAccessToken, input.phoneNumber);
    const uploaded = await uploadFileToDrive(driveAccessToken, {
      folderId,
      name: `${input.mediaId}.${extension}`,
      mimeType,
      data,
    });

    return { mediaUrl: uploaded.webViewLink ?? uploaded.webContentLink };
  } catch (error) {
    return {
      mediaError: error instanceof Error ? error.message : "Error desconocido al guardar el archivo.",
    };
  }
}
