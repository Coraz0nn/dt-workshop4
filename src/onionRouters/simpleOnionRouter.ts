import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import {
  generateRsaKeyPair,
  exportPubKey,
  exportPrvKey,
  rsaDecrypt,
  symDecrypt,
} from "../crypto";

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;

  // Génération de la paire de clés RSA pour ce nœud
  const { publicKey, privateKey } = await generateRsaKeyPair();
  const exportedPubKey = await exportPubKey(publicKey);
  const exportedPrvKey = await exportPrvKey(privateKey);

  // Enregistrement du nœud dans le registre
  await fetch(`http://localhost:${REGISTRY_PORT}/registerNode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeId, pubKey: exportedPubKey }),
  });

  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });
  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });
  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  // Retourne directement la clé privée (déjà en Base64)
  onionRouter.get("/getPrivateKey", (req, res) => {
    res.json({ result: exportedPrvKey });
  });

  onionRouter.post("/message", async (req, res) => {
    try {
      const { message } = req.body;
      lastReceivedEncryptedMessage = message;
      const rsaEncKeyLength = 344; // taille fixe attendue pour la partie RSA
      const encryptedSymKey = message.slice(0, rsaEncKeyLength);
      const encryptedPayload = message.slice(rsaEncKeyLength);
      const symKeyExported = await rsaDecrypt(encryptedSymKey, privateKey);
      const decryptedLayer = await symDecrypt(symKeyExported, encryptedPayload);
      lastReceivedDecryptedMessage = decryptedLayer;
      const destStr = decryptedLayer.slice(0, 10);
      const nextPayload = decryptedLayer.slice(10);
      lastMessageDestination = parseInt(destStr, 10);
      if (nextPayload) {
        await fetch(`http://localhost:${lastMessageDestination}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: nextPayload }),
        });
      }
      res.json({ result: "Message processed" });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMessage });
    }
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${BASE_ONION_ROUTER_PORT + nodeId}`
    );
  });

  return server;
}
