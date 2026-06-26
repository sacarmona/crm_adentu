const DRIVE_API_URL = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3";

export const GOOGLE_DRIVE_MEDIA_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

export function googleDriveScopesGranted(scope?: string | null) {
  const granted = new Set((scope ?? "").split(/\s+/).filter(Boolean));
  return GOOGLE_DRIVE_MEDIA_SCOPES.every((required) => granted.has(required));
}

async function driveJson<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DRIVE_API_URL}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Drive rechazo la solicitud (${response.status}): ${detail}`);
  }
  return (await response.json()) as T;
}

export async function ensureDriveFolder(
  accessToken: string,
  input: { name: string; parentId?: string | null },
) {
  const queryParts = [
    `name = '${input.name.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ];
  if (input.parentId) queryParts.push(`'${input.parentId}' in parents`);

  const url = new URL(`${DRIVE_API_URL}/files`);
  url.searchParams.set("q", queryParts.join(" and "));
  url.searchParams.set("fields", "files(id,name)");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Drive rechazo la busqueda de carpeta (${response.status}): ${detail}`);
  }
  const found = (await response.json()) as { files?: { id: string }[] };
  if (found.files?.[0]?.id) return found.files[0].id;

  const created = await driveJson<{ id: string }>(accessToken, "files", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      mimeType: "application/vnd.google-apps.folder",
      parents: input.parentId ? [input.parentId] : undefined,
    }),
  });
  return created.id;
}

export async function uploadFileToDrive(
  accessToken: string,
  input: { folderId: string; name: string; mimeType: string; data: Buffer },
) {
  const boundary = "crm_adentu_whatsapp_media_boundary";
  const metadata = JSON.stringify({ name: input.name, parents: [input.folderId] });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`,
    ),
    input.data,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const response = await fetch(
    `${DRIVE_UPLOAD_URL}/files?uploadType=multipart&fields=id,webViewLink,webContentLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Drive rechazo la subida del archivo (${response.status}): ${detail}`);
  }
  return (await response.json()) as { id: string; webViewLink?: string; webContentLink?: string };
}
