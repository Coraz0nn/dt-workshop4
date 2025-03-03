import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

// Stockage temporaire des nœuds enregistrés
const registeredNodes: Node[] = [];

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // Route /status
  _registry.get("/status", (req: Request, res: Response) => {
    res.send("live");
  });

  // Route /registerNode pour enregistrer un nœud
  _registry.post("/registerNode", (req: Request, res: Response) => {
    const { nodeId, pubKey } = req.body;

    if (typeof nodeId !== "number" || typeof pubKey !== "string") {
      return res.status(400).json({ error: "Invalid request format" });
    }

    // Vérifie si le nœud est déjà enregistré
    if (registeredNodes.some(node => node.nodeId === nodeId)) {
      return res.status(400).json({ error: "Node already registered" });
    }

    registeredNodes.push({ nodeId, pubKey });
    console.log(`✅ Node ${nodeId} registered with public key: ${pubKey}`);
    res.status(200).json({ message: "Node registered successfully" });
  });

  // Route /getNodeRegistry pour récupérer la liste des nœuds enregistrés
  _registry.get("/getNodeRegistry", (req: Request, res: Response) => {
    res.status(200).json({ nodes: registeredNodes });
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`📡 Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
