import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/** Derive a per-user encryption key from the master key */
function deriveKey(userId: string): Buffer {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY!;
  return createHmac("sha256", masterKey).update(userId).digest();
}

/** Encrypt a string for a specific user. Returns Buffer: [IV (12) | ciphertext | authTag (16)] */
export function encrypt(plaintext: string, userId: string): Buffer {
  const key = deriveKey(userId);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, authTag]);
}

/** Decrypt a buffer for a specific user */
export function decrypt(data: Buffer, userId: string): string {
  const key = deriveKey(userId);
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(data.length - TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext) + decipher.final("utf8");
}
