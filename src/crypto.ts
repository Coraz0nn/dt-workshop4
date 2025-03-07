import crypto from "crypto";

export interface MyCryptoKey {
  key: crypto.KeyObject;
  algorithm: { name: string };
  extractable: boolean;
  type: "public" | "private" | "secret";
}

// ------------------------
// RSA Key Functions
// ------------------------

// Génère une paire de clés RSA (2048 bits)
export async function generateRsaKeyPair(): Promise<{ publicKey: MyCryptoKey; privateKey: MyCryptoKey }> {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicExponent: 0x10001,
  });
  return {
    publicKey: { key: publicKey, algorithm: { name: "RSA-OAEP" }, extractable: true, type: "public" },
    privateKey: { key: privateKey, algorithm: { name: "RSA-OAEP" }, extractable: true, type: "private" }
  };
}

// Exporte une clé publique RSA en Base64 (format brut, sans headers PEM)
export async function exportPubKey(key: MyCryptoKey): Promise<string> {
  const pem = key.key.export({ type: "spki", format: "pem" }).toString();
  return pem.replace(/-----BEGIN PUBLIC KEY-----/g, "")
            .replace(/-----END PUBLIC KEY-----/g, "")
            .replace(/\n/g, "")
            .trim();
}

// Exporte une clé privée RSA en Base64 (format brut, sans headers PEM)
export async function exportPrvKey(key: MyCryptoKey): Promise<string> {
  const pem = key.key.export({ type: "pkcs8", format: "pem" }).toString();
  return pem.replace(/-----BEGIN PRIVATE KEY-----/g, "")
            .replace(/-----END PRIVATE KEY-----/g, "")
            .replace(/\n/g, "")
            .trim();
}

// Importe une clé publique RSA depuis une chaîne Base64
export async function importPubKey(strKey: string): Promise<MyCryptoKey> {
  const pem = `-----BEGIN PUBLIC KEY-----\n${strKey}\n-----END PUBLIC KEY-----\n`;
  const keyObj = crypto.createPublicKey(pem);
  return { key: keyObj, algorithm: { name: "RSA-OAEP" }, extractable: true, type: "public" };
}

// Importe une clé privée RSA depuis une chaîne Base64
export async function importPrvKey(strKey: string): Promise<MyCryptoKey> {
  const pem = `-----BEGIN PRIVATE KEY-----\n${strKey}\n-----END PRIVATE KEY-----\n`;
  const keyObj = crypto.createPrivateKey(pem);
  return { key: keyObj, algorithm: { name: "RSA-OAEP" }, extractable: true, type: "private" };
}

// Chiffre un message avec une clé publique RSA
// b64Data est la chaîne Base64 représentant les données à chiffrer.
export async function rsaEncrypt(b64Data: string, strPublicKey: string): Promise<string> {
  const pubKey = await importPubKey(strPublicKey);
  const buffer = Buffer.from(b64Data, "base64");
  const encrypted = crypto.publicEncrypt(
    { key: pubKey.key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    buffer
  );
  return encrypted.toString("base64");
}

// Déchiffre un message avec une clé privée RSA
// Retourne le résultat sous forme de chaîne Base64.
export async function rsaDecrypt(data: string, privateKey: MyCryptoKey): Promise<string> {
  const decrypted = crypto.privateDecrypt(
    { key: privateKey.key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(data, "base64")
  );
  return Buffer.from(decrypted).toString("base64");
}

// ------------------------
// Symmetric Key Functions (AES-256-CBC)
// ------------------------

// Génère une clé symétrique AES (256 bits) en utilisant AES-CBC
export async function createRandomSymmetricKey(): Promise<MyCryptoKey> {
  const keyBuffer = crypto.randomBytes(32); // 32 octets = 256 bits
  const keyObj = crypto.createSecretKey(keyBuffer);
  return { key: keyObj, algorithm: { name: "AES-CBC" }, extractable: true, type: "secret" };
}

// Exporte une clé symétrique AES en Base64
export async function exportSymKey(key: MyCryptoKey): Promise<string> {
  const buffer = key.key.export();
  return Buffer.from(buffer).toString("base64");
}

// Importe une clé symétrique AES depuis une chaîne Base64 (AES-CBC)
export async function importSymKey(strKey: string): Promise<MyCryptoKey> {
  const keyBuffer = Buffer.from(strKey, "base64");
  const keyObj = crypto.createSecretKey(keyBuffer);
  return { key: keyObj, algorithm: { name: "AES-CBC" }, extractable: true, type: "secret" };
}

// Chiffre un message avec AES-256-CBC
// Renvoie une chaîne au format "iv.encrypted" avec chaque partie en Base64.
export async function symEncrypt(key: MyCryptoKey, data: string): Promise<string> {
  const iv = crypto.randomBytes(16); // IV de 16 octets pour AES-CBC
  const cipher = crypto.createCipheriv("aes-256-cbc", key.key.export(), iv);
  let encrypted = cipher.update(data, "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + "." + encrypted;
}

// Déchiffre un message avec AES-256-CBC
export async function symDecrypt(strKey: string, encryptedData: string): Promise<string> {
  const [ivBase64, cipherText] = encryptedData.split(".");
  const iv = Buffer.from(ivBase64, "base64");
  const key = await importSymKey(strKey);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key.key.export(), iv);
  let decrypted = decipher.update(cipherText, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
