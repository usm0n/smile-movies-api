import { NextFunction, Request, Response } from "express";
import "dotenv/config";

function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.header("X-API-Key");
    const validApiKey = process.env.API_SECRET_KEY;

    if (apiKey && apiKey === validApiKey) {
      next();
    } else {
      res.status(403).send("Forbidden");
    }
  } catch (error) {
    console.error(error);
  }
}

export default apiKeyMiddleware;
