import { describe, it, expect, beforeAll } from "vitest";

// Set env before importing
process.env.ENCRYPTION_MASTER_KEY =
  "351b193db757e37be4224909e39836bb223aea2268a0cabc3ed8e952e1800bea";

import { encrypt, decrypt } from "@/lib/encryption";

describe("Encryption", () => {
  const userId = "test-user-123";

  it("encrypts and decrypts a simple string", () => {
    const plaintext = "田中 太郎";
    const encrypted = encrypt(plaintext, userId);

    expect(typeof encrypted).toBe("string");
    expect(encrypted.length).toBeGreaterThan(plaintext.length);

    const decrypted = decrypt(encrypted, userId);
    expect(decrypted).toBe(plaintext);
  });

  it("different users produce different ciphertexts", () => {
    const plaintext = "test@example.com";
    const enc1 = encrypt(plaintext, "user-1");
    const enc2 = encrypt(plaintext, "user-2");

    expect(enc1).not.toBe(enc2);
  });

  it("fails to decrypt with wrong user ID", () => {
    const plaintext = "090-1234-5678";
    const encrypted = encrypt(plaintext, "user-a");

    expect(() => decrypt(encrypted, "user-b")).toThrow();
  });

  it("handles Japanese text correctly", () => {
    const plaintext = "タナカ タロウ 東京都渋谷区1-2-3";
    const encrypted = encrypt(plaintext, userId);
    const decrypted = decrypt(encrypted, userId);
    expect(decrypted).toBe(plaintext);
  });

  it("handles empty string", () => {
    const encrypted = encrypt("", userId);
    const decrypted = decrypt(encrypted, userId);
    expect(decrypted).toBe("");
  });
});
