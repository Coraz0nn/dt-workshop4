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

  // TODO implement the status route
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  // Route /getLastReceivedMessage
  _user.get("/getLastReceivedMessage", (req: Request, res: Response) => {
    res.json({ result: lastReceivedMessage });
  });

  // Route /getLastSentMessage
  _user.get("/getLastSentMessage", (req: Request, res: Response) => {
    res.json({ result: lastSentMessage });
  });

  const port = BASE_USER_PORT + userId;
  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
