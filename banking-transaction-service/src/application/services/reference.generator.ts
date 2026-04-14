import { randomBytes } from "crypto";
import { REFERENCE_RANDOM_LENGTH } from "../../config";

const REFERENCE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSuffix(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  }
  return out;
}

export function generateTransactionReference(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const datePart = `${y}${m}${d}`;
  return `TXN${datePart}-${randomSuffix(REFERENCE_RANDOM_LENGTH)}`;
}
