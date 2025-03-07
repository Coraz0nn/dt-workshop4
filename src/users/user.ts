import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT, BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import {
  createRandomSymmetricKey,
  exportSymKey,
  symEncrypt,
  rsaEncrypt,
} from "../crypto";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;
  let lastCircuit: number[] | null = null;

  // Route /status
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  // Routes GET pour récupérer les messages et le circuit
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });
  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });
  _user.get("/getLastCircuit", (req, res) => {
    res.json({ result: lastCircuit });
  });

  // Route POST /message pour recevoir un message
  // Cette route renvoie "success" (texte brut) pour satisfaire le test
  _user.post("/message", (req, res) => {
    const { message } = req.body;
    lastReceivedMessage = message;
    res.send("success");
  });

  // Route POST /sendMessage pour envoyer un message à travers le réseau onion
  _user.post("/sendMessage", async (req, res) => {
    try {
      const { message, destinationUserId } = req.body as SendMessageBody;
      lastSentMessage = message;

      // Récupération du registre des nœuds
      const registryResponse = await fetch(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
      interface NodeRegistry {
        nodes: { nodeId: number; pubKey: string }[];
      }
      const registryData = (await registryResponse.json()) as NodeRegistry;
      const nodes = registryData.nodes;
      
      if (nodes.length < 3) {
        throw new Error("Not enough nodes in the registry");
      }
      // Sélection aléatoire de 3 nœuds distincts
      nodes.sort(() => Math.random() - 0.5);
      const circuit = nodes.slice(0, 3);
      lastCircuit = circuit.map((n) => BASE_ONION_ROUTER_PORT + n.nodeId);

      // Destination finale pour l'utilisateur destinataire (codée sur 10 caractères)
      const finalDest = (BASE_USER_PORT + destinationUserId).toString().padStart(10, "0");
      // Payload initial = destination finale + message
      let payload = finalDest + message;

      // Construction des couches d'encryption (en partant du dernier nœud jusqu'au premier)
      for (let i = circuit.length - 1; i >= 0; i--) {
        let nextHop: string;
        if (i === circuit.length - 1) {
          nextHop = finalDest;
        } else {
          nextHop = (BASE_ONION_ROUTER_PORT + circuit[i + 1].nodeId)
            .toString()
            .padStart(10, "0");
        }
        const messageToEncrypt = nextHop + payload;
        const symKey = await createRandomSymmetricKey();
        const symKeyExported = await exportSymKey(symKey);
        const encryptedLayer = await symEncrypt(symKey, messageToEncrypt);
        const encryptedSymKey = await rsaEncrypt(symKeyExported, circuit[i].pubKey);
        // La nouvelle couche est la concaténation de l'encryption RSA de la clé symétrique et de l'encryption symétrique
        payload = encryptedSymKey + encryptedLayer;
      }

      // Envoi du payload final au nœud d'entrée du circuit
      const entryNodePort = BASE_ONION_ROUTER_PORT + circuit[0].nodeId;
      await fetch(`http://localhost:${entryNodePort}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: payload }),
      });
      res.json({ result: "Message sent" });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMessage });
    }
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(`User ${userId} is listening on port ${BASE_USER_PORT + userId}`);
  });

  return server;
}
