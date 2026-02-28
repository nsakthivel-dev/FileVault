import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import express from "express";

const uploadDir = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized" });
  };

  app.get("/api/documents", requireAuth, async (req, res) => {
    const docs = await storage.getDocuments(req.user!.id);
    res.json(docs);
  });

  app.get("/api/documents/:id", requireAuth, async (req, res) => {
    const doc = await storage.getDocument(req.params.id as string);
    if (!doc || doc.userId !== req.user!.id) {
      return res.status(404).json({ message: "Not found" });
    }
    res.json(doc);
  });

  app.post("/api/documents", requireAuth, upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const doc = await storage.createDocument({
      id: path.parse(req.file.filename).name,
      userId: req.user!.id,
      originalName: req.file.originalname,
      storedPath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    res.status(201).json(doc);
  });

  app.delete("/api/documents/:id", requireAuth, async (req, res) => {
    const doc = await storage.getDocument(req.params.id as string);
    if (!doc || doc.userId !== req.user!.id) {
      return res.status(404).json({ message: "Not found" });
    }

    await storage.deleteDocument(doc.id);
    try {
      await fs.unlink(doc.storedPath);
    } catch (e) {
      console.error("Failed to delete file from filesystem", e);
    }

    res.sendStatus(204);
  });

  app.get("/api/documents/:id/download", requireAuth, async (req, res) => {
    const doc = await storage.getDocument(req.params.id as string);
    if (!doc || doc.userId !== req.user!.id) {
      return res.status(404).json({ message: "Not found" });
    }

    res.download(doc.storedPath, doc.originalName);
  });

  app.get("/api/documents/:id/preview", requireAuth, async (req, res) => {
    const doc = await storage.getDocument(req.params.id as string);
    if (!doc || doc.userId !== req.user!.id) {
      return res.status(404).json({ message: "Not found" });
    }

    res.set({
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.originalName}"`
    });
    res.sendFile(path.resolve(doc.storedPath));
  });

  return httpServer;
}