import { app } from "../server/index";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";

let isReady = false;
let initPromise: Promise<void> | null = null;

async function ensureInit() {
  if (isReady) return;
  if (!initPromise) {
    const server = createServer(app);
    initPromise = registerRoutes(server, app).then(() => {
      isReady = true;
    });
  }
  await initPromise;
}

export default async function handler(req: any, res: any) {
  await ensureInit();
  return (app as any)(req, res);
}
