import { webcrypto } from "crypto";

// #############
// ### Utils ###
// #############

// Fonction pour convertir un ArrayBuffer en base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Fonction pour convertir une chaîne base64 en ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// ################
// ### RSA keys ###
// ################

// Génère une paire de clés RSA (2048 bits)
export async function generateRsaKeyPair(): Promise<{ publicKey: webcrypto.CryptoKey; privateKey: webcrypto.CryptoKey }> {
  return await webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // Clés extractibles
    ["encrypt", "decrypt"]
  ) as { publicKey: webcrypto.CryptoKey; privateKey: webcrypto.CryptoKey };
}

// Exporte une clé publique RSA en base64
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  const exported = await webcrypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}

// Exporte une clé privée RSA en base64
export async function exportPrvKey(key: webcrypto.CryptoKey): Promise<string> {
  const exported = await webcrypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exported);
}

// Importe une clé publique RSA depuis une chaîne base64
export async function importPubKey(strKey: string): Promise<webcrypto.CryptoKey> {
  const buffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
    "spki",
    buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

// Importe une clé privée RSA depuis une chaîne base64
export async function importPrvKey(strKey: string): Promise<webcrypto.CryptoKey> {
  const buffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
    "pkcs8",
    buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

// Chiffre un message avec une clé publique RSA
export async function rsaEncrypt(b64Data: string, strPublicKey: string): Promise<string> {
  const publicKey = await importPubKey(strPublicKey);
  const encrypted = await webcrypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    Buffer.from(b64Data, "base64")
  );
  return arrayBufferToBase64(encrypted);
}

// Déchiffre un message avec une clé privée RSA
export async function rsaDecrypt(data: string, privateKey: webcrypto.CryptoKey): Promise<string> {
  const decrypted = await webcrypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToArrayBuffer(data)
  );
  return new TextDecoder().decode(decrypted);
}

// ######################
// ### Symmetric keys ###
// ######################

// Génère une clé symétrique AES (256 bits)
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
  return await webcrypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Exporte une clé symétrique AES en base64
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  const exported = await webcrypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}

// Importe une clé symétrique AES depuis une chaîne base64
export async function importSymKey(strKey: string): Promise<webcrypto.CryptoKey> {
  const buffer = base64ToArrayBuffer(strKey);
  return await webcrypto.subtle.importKey(
    "raw",
    buffer,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Chiffre un message avec une clé symétrique AES
export async function symEncrypt(key: webcrypto.CryptoKey, data: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Générer un IV aléatoire
  const encodedData = new TextEncoder().encode(data);
  const encrypted = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedData
  );
  return arrayBufferToBase64(iv) + "." + arrayBufferToBase64(encrypted);
}

// Déchiffre un message avec une clé symétrique AES
export async function symDecrypt(strKey: string, encryptedData: string): Promise<string> {
  const [ivBase64, cipherTextBase64] = encryptedData.split(".");
  const iv = base64ToArrayBuffer(ivBase64);
  const cipherText = base64ToArrayBuffer(cipherTextBase64);

  const key = await importSymKey(strKey);
  const decrypted = await webcrypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherText
  );
  return new TextDecoder().decode(decrypted);
}
