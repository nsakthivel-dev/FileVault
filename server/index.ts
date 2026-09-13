import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import net from "net";

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

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // Helper to check if a port is available
  function checkPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const tester = net.createServer();
      tester.once("error", () => {
        resolve(false);
      });
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port);
    });
  }

  // Find the first available port starting from startPort
  async function findAvailablePort(startPort: number, maxAttempts = 20): Promise<number> {
    let currentPort = startPort;
    for (let i = 0; i < maxAttempts; i++) {
      const isAvailable = await checkPortAvailable(currentPort);
      if (isAvailable) {
        return currentPort;
      }
      log(`Port ${currentPort} is busy, trying port ${currentPort + 1}...`);
      currentPort++;
    }
    throw new Error(`No available ports found after ${maxAttempts} attempts starting from ${startPort}`);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // If the port is busy, automatically find and use the next available port.
  if (process.env.NODE_ENV !== "test") {
    const initialPort = parseInt(process.env.PORT || "5000", 10);
    const port = await findAvailablePort(initialPort);
    httpServer.listen(port, () => {
      log(`serving on port ${port} - http://localhost:${port}`);
      console.log(`\n  ➜  Local:   http://localhost:${port}/`);
      console.log(`  ➜  Network: http://127.0.0.1:${port}/\n`);
    });
  }
})();

export { app, httpServer };

