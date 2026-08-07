export type PrivateVaultData = {
  profile: { name: string; studentId: string; passportId: string };
  medicalInfo: { allergies: string; medications: string; bloodType: string; emergencyContact: string };
  emergencyDetails: { accommodation: string; university: string; embassy: string; insurance: string; localEmergency: string };
};

export type EncryptedVault = { version: 1; salt: string; iv: string; ciphertext: string };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string { let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary); }
function fromBase64(value: string): Uint8Array { const binary = atob(value); return Uint8Array.from(binary, (character) => character.charCodeAt(0)); }

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 120_000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptPrivateData(data: PrivateVaultData, pin: string): Promise<EncryptedVault> {
  if (pin.length < 6) throw new Error("PIN must be at least 6 characters.");
  const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt); const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(data)));
  return { version: 1, salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

export async function decryptPrivateData(vault: EncryptedVault, pin: string): Promise<PrivateVaultData> {
  if (vault.version !== 1) throw new Error("Unsupported private vault version.");
  try {
    const key = await deriveKey(pin, fromBase64(vault.salt)); const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(vault.iv) }, key, fromBase64(vault.ciphertext));
    return JSON.parse(decoder.decode(plaintext)) as PrivateVaultData;
  } catch { throw new Error("Incorrect PIN or corrupted private data."); }
}
