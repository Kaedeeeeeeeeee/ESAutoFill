import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/** Derive a per-user encryption key from the master key */
function deriveKey(userId: string): Buffer {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY!;
  return createHmac("sha256", masterKey).update(userId).digest();
}

/** Encrypt a string for a specific user. Returns hex string for DB storage. */
export function encrypt(plaintext: string, userId: string): string {
  const key = deriveKey(userId);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, authTag]).toString("hex");
}

/** Decrypt a hex string for a specific user */
export function decrypt(data: string | Buffer, userId: string): string {
  const buf = typeof data === "string"
    ? Buffer.from(data.replace(/^\\x/, ""), "hex")
    : data;

  const key = deriveKey(userId);
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(buf.length - TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext) + decipher.final("utf8");
}
