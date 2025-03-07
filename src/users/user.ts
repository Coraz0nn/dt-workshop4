import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { BASE_USER_PORT } from "../config";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

let lastReceivedMessage: string | null = null;
let lastSentMessage: string | null = null;

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  _user.get("/status", (req: Request, res: Response) => {
    res.send("live");
  });
  _user.get("/getLastReceivedMessage", (req: Request, res: Response) => {
    res.json({ result: lastReceivedMessage });
  });
  _user.get("/getLastSentMessage", (req: Request, res: Response) => {
    res.json({ result: lastSentMessage });
  });

  _user.post("/message", (req: Request, res: Response) => {
    const { message } = req.body;
    if (typeof message !== "string") {
      return res.status(400).json({ error: "Invalid request format. 'message' should be a string." });
    }
    lastReceivedMessage = message;
    console.log(`📩 User ${userId} received message: "${message}"`);
    return res.status(200).send("success");
  });

  // Stub pour la route /getLastCircuit (pour éviter les erreurs JSON dans les tests de circuit)
  _user.get("/getLastCircuit", (req: Request, res: Response) => {
    res.json({ result: [] });
  });

  const port = BASE_USER_PORT + userId;
  const server = _user.listen(port, () => {
    console.log(`👤 User ${userId} is listening on port ${port}`);
  });

  return server;
}


