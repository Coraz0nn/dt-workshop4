import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { BASE_USER_PORT } from "../config";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

// Variables globales pour stocker le dernier message reçu et envoyé
let lastReceivedMessage: string | null = null;
let lastSentMessage: string | null = null;

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // ✅ Route /status
  _user.get("/status", (req: Request, res: Response) => {
    res.send("live");
  });

  // ✅ Route /getLastReceivedMessage
  _user.get("/getLastReceivedMessage", (req: Request, res: Response) => {
    res.json({ result: lastReceivedMessage });
  });

  // ✅ Route /getLastSentMessage
  _user.get("/getLastSentMessage", (req: Request, res: Response) => {
    res.json({ result: lastSentMessage });
  });

  // ✅ Route /message pour recevoir un message
  _user.post("/message", (req: Request, res: Response) => {
    const { message } = req.body;

    if (typeof message !== "string") {
      return res.status(400).json({ error: "Invalid request format. 'message' should be a string." });
    }

    lastReceivedMessage = message;
    console.log(`📩 User ${userId} received message: "${message}"`);
    return res.status(200).json({ message: "Message received successfully" });
  });

  const port = BASE_USER_PORT + userId;
  const server = _user.listen(port, () => {
    console.log(`👤 User ${userId} is listening on port ${port}`);
  });

  return server;
}
