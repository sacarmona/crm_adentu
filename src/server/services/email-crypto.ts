import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { env } from "../../lib/env";

function encryptionKey() {
  const source = env.EMAIL_TOKEN_ENCRYPTION_KEY ?? env.AUTH_SECRET;

  if (!source) {
    throw new Error("Configura EMAIL_TOKEN_ENCRYPTION_KEY para conectar buzones.");
  }

  return createHash("sha256").update(source).digest();
}

export function encryptEmailToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptEmailToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("El token cifrado no tiene un formato valido.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
