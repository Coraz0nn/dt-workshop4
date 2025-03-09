import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, BASE_USER_PORT, REGISTRY_PORT } from "../config";
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

  const { publicKey, privateKey } = await generateRsaKeyPair();
  const exportedPubKey = await exportPubKey(publicKey);
  const exportedPrvKey = await exportPrvKey(privateKey);

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
  onionRouter.get("/getPrivateKey", (req, res) => {
    res.json({ result: exportedPrvKey });
  });

  onionRouter.post("/message", async (req, res) => {
    try {
      const { message } = req.body;
      lastReceivedEncryptedMessage = message;

      const rsaEncKeyLength = 344;
      const encryptedSymKey = message.slice(0, rsaEncKeyLength);
      const encryptedPayload = message.slice(rsaEncKeyLength);

      const symKeyExported = await rsaDecrypt(encryptedSymKey, privateKey);
      const decryptedLayer = await symDecrypt(symKeyExported, encryptedPayload);
      lastReceivedDecryptedMessage = decryptedLayer;

      const destStr = decryptedLayer.slice(0, 10);
      const rawDest = parseInt(destStr, 10);
      lastMessageDestination = rawDest < 1000 ? BASE_ONION_ROUTER_PORT + rawDest : rawDest;
      const nextPayload = decryptedLayer.slice(10);

      if (nextPayload.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        // Forwarder le message complet pour que le prochain nœud puisse extraire son préfixe
        await fetch(`http://localhost:${lastMessageDestination}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: decryptedLayer }),
        });
      }
      res.json({ result: "Message processed" });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMessage });
    }
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(`Onion router ${nodeId} is listening on port ${BASE_ONION_ROUTER_PORT + nodeId}`);
  });

  return server;
}



