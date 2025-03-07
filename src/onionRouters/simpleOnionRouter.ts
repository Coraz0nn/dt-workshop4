import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import axios, { AxiosError } from "axios";
import { generateRsaKeyPair, exportPubKey, exportPrvKey } from "../crypto";

let lastReceivedEncryptedMessage: string | null = null;
let lastReceivedDecryptedMessage: string | null = null;
let lastMessageDestination: number | null = null;

export async function simpleOnionRouter(nodeId: number) {
  // Génération des clés RSA via notre fonction dans crypto.ts
  const { publicKey, privateKey } = await generateRsaKeyPair();

  // Export de la clé privée en Base64 (format brut)
  const privateKeyBase64 = await exportPrvKey(privateKey);

  // Export de la clé publique en Base64 (format brut)
  const publicKeyBase64 = await exportPubKey(publicKey);

  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // Route /status
  onionRouter.get("/status", (req: Request, res: Response) => {
    res.send("live");
  });

  // Routes pour récupérer les messages (initialement null)
  onionRouter.get("/getLastReceivedEncryptedMessage", (req: Request, res: Response) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });
  onionRouter.get("/getLastReceivedDecryptedMessage", (req: Request, res: Response) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });
  onionRouter.get("/getLastMessageDestination", (req: Request, res: Response) => {
    res.json({ result: lastMessageDestination });
  });

  // Route pour récupérer la clé privée (pour les tests)
  onionRouter.get("/getPrivateKey", async (req: Request, res: Response) => {
    res.json({ result: privateKeyBase64 });
  });

  const port = BASE_ONION_ROUTER_PORT + nodeId;
  const server = onionRouter.listen(port, async () => {
    console.log(`Onion router ${nodeId} is listening on port ${port}`);

    // Enregistrement automatique du nœud dans le registre
    try {
      await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, {
        nodeId,
        pubKey: publicKeyBase64,
      });
      console.log(`✅ Node ${nodeId} successfully registered with registry.`);
    } catch (error) {
      const err = error as AxiosError;
      console.error(`❌ Failed to register node ${nodeId}:`, err.response?.data || err.message);
    }
  });

  return server;
}
