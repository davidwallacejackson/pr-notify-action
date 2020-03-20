import { Request, Response } from "express";

export default async function handleJiraWebhook(
  req: Request,
  res: Response
): Promise<void> {
  
  res.send(200);
}