import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

let isReady = false;
let initPromise: Promise<void> | null = null;

async function ensureInit() {
  if (isReady) return;
  if (!initPromise) {
    initPromise = (async () => {
      await registerRoutes(httpServer, app);
      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error("Internal Server Error:", err);
        if (res.headersSent) {
          return next(err);
        }
        return res.status(status).json({ message });
      });
      isReady = true;
    })();
  }
  await initPromise;
}

export default async function handler(req: any, res: any) {
  await ensureInit();
  return (app as any)(req, res);
}
