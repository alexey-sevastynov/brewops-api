import * as crypto from "crypto";
import { getRequiredEnv } from "./infra/env-functions";
import { envKeys } from "../enums/infra/env-key";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits — recommended for GCM

/**
 * Encrypts a plain-text string using AES-256-GCM.
 * Returns a hex string in the format: iv:authTag:ciphertext
 */
export function encrypt(text: string): string {
    const secret = getRequiredEnv(envKeys.encryptionSecret);
    const key = Buffer.from(secret, "hex");

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypts a string previously encrypted by `encrypt()`.
 * Returns the original plain-text string.
 */
export function decrypt(encryptedText: string): string {
    const secret = getRequiredEnv(envKeys.encryptionSecret);
    const key = Buffer.from(secret, "hex");

    const [ivHex, tagHex, dataHex] = encryptedText.split(":");

    if (!ivHex || !tagHex || !dataHex) {
        throw new Error("Invalid encrypted format");
    }

    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const data = Buffer.from(dataHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(data).toString("utf8") + decipher.final("utf8");
}

/**
 * Returns true if the string looks like an AES-256-GCM encrypted value (iv:tag:data).
 * Used to handle already-encrypted vs plain-text values gracefully.
 */
export function isEncrypted(value: string): boolean {
    const parts = value.split(":");
    return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/i.test(p));
}
