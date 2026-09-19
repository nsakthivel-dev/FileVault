import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { getSupabaseAdmin, getSupabaseBucketName } from "./supabase";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { 
  DocumentRecord, 
  ShareRecord, 
  createDocumentSchema, 
  updateDocumentSchema, 
  createShareSchema,
  DocumentCategories,
  VerificationStatus,
  DocumentCategory
} from "@shared/schema";
import { 
  validateFileSecurity, 
  processDocumentIntelligence, 
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE 
} from "./services/analyzer";

// Memory storage for multer so we can validate and dispatch directly to Cloud Storage / Firestore storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }, // 15MB limit
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file format. Supported: PDF, PNG, JPG, JPEG, WEBP, and DOCX."));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // Authentication Guard
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.user || req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized. Please authenticate." });
  };

  // Debug endpoint to inspect production storage connectivity
  app.get("/api/debug-status", async (req, res) => {
    try {
      const userId = "1a06da63-2282-4a08-b17e-b57b188ca1ce";
      const supabase = getSupabaseAdmin();
      const bucket = getSupabaseBucketName();
      let usersList: any = null;
      let errorMsg: string | null = null;
      let manifestLength = 0;
      if (supabase) {
        const { data, error } = await supabase.storage.from(bucket).list("users");
        usersList = data;
        errorMsg = error?.message || null;
        const { data: m } = await supabase.storage.from(bucket).download("users/sakthicud07_gmail_com/.vault_manifest.json");
        if (m) {
          const t = await m.text();
          manifestLength = t.length;
        }
      }

      const userFolder = await storage.getUserFolder(userId);
      const docs = await storage.getDocuments(userId);

      res.json({
        deployedAt: "2026-09-13T22:08:00Z",
        supabaseActive: !!supabase,
        bucket,
        usersList,
        manifestLength,
        userFolder,
        docsCount: docs.length,
        docs: docs.map((d) => ({ id: d.id, title: d.title, path: d.storagePath })),
        errorMsg,
        envServiceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message, stack: e.stack });
    }
  });

  // ----------------------------------------------------
  // DOCUMENTS ENDPOINTS
  // ----------------------------------------------------

  // 1. List user documents (supports ?category=, ?status=, ?search=)
  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      let docs = await storage.getDocuments(userId);

      const { category, status, search, tag } = req.query;

      if (category && typeof category === "string" && category !== "all") {
        const cat = category.toLowerCase();
        docs = docs.filter((d) => 
          d.documentType?.toLowerCase() === cat || 
          d.subType?.toLowerCase() === cat
        );
      }

      if (status && typeof status === "string" && status !== "all") {
        const st = status.toLowerCase();
        docs = docs.filter((d) => 
          d.verificationStatus?.toLowerCase() === st || 
          d.processingStatus?.toLowerCase() === st
        );
      }

      if (tag && typeof tag === "string" && tag !== "all") {
        const targetTag = tag.toLowerCase();
        docs = docs.filter((d) => d.tags && d.tags.some((t) => t.toLowerCase() === targetTag));
      }

      if (search && typeof search === "string" && search.trim() !== "") {
        const q = search.toLowerCase();
        docs = docs.filter(
          (d) =>
            d.originalName.toLowerCase().includes(q) ||
            (d.title && d.title.toLowerCase().includes(q)) ||
            (d.organization && d.organization.toLowerCase().includes(q)) ||
            (d.personName && d.personName.toLowerCase().includes(q)) ||
            (d.institution && d.institution.toLowerCase().includes(q)) ||
            (d.certificateNumber && d.certificateNumber.toLowerCase().includes(q)) ||
            (d.recipientName && d.recipientName.toLowerCase().includes(q)) ||
            (d.tags && d.tags.some((t) => t.toLowerCase().includes(q))) ||
            (d.skills && d.skills.some((s) => s.toLowerCase().includes(q)))
        );
      }

      // Sort newest first
      docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      res.json(docs);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to retrieve documents" });
    }
  });

  // 2. Get single document
  app.get("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id as string, req.user!.id);
      const isOwner = doc && (
        doc.ownerId === req.user!.id ||
        doc.ownerId === req.user!.email ||
        doc.ownerId === (req.user as any)?.username ||
        (req.user!.email && doc.ownerId === req.user!.email.replace(/[^a-z0-9_-]/g, "_"))
      );
      if (!doc || !isOwner || doc.isDeleted) {
        return res.status(404).json({ message: "Document not found" });
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "DOCUMENT_VIEWED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "Document metadata viewed",
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json(doc);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Error fetching document" });
    }
  });

  // 3. Upload single document
  app.post(
    "/api/documents",
    requireAuth,
    (req, res, next) => {
      upload.single("file")(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File size exceeds the 15MB limit." });
          }
          return res.status(400).json({ message: err.message });
        } else if (err) {
          return res.status(400).json({ message: err.message });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file was uploaded." });
        }

        const userId = req.user!.id;
        const validation = validateFileSecurity(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );

        if (!validation.valid) {
          return res.status(400).json({ message: validation.error || "File security check failed" });
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        const documentId = randomUUID();
        const secureFileName = `${documentId}${ext}`;

        // Validate or accept document category
        const rawCategory = (req.body.documentType || "other").toLowerCase();
        const documentType: DocumentCategory = DocumentCategories.includes(rawCategory as any)
          ? (rawCategory as DocumentCategory)
          : "other";

        // Store file in Cloud Storage: users/{userId}/documents/{category}/{fileName}
        const storagePath = await storage.saveFile(
          userId,
          documentType,
          secureFileName,
          req.file.buffer
        );

        let verificationStatus: VerificationStatus = "Uploaded";
        if (documentType === "certificates" || documentType === "identity") {
          verificationStatus = "Unverified";
        }

        const now = new Date().toISOString();
        const docRecord: DocumentRecord = {
          id: documentId,
          ownerId: userId,
          fileName: secureFileName,
          originalName: req.file.originalname,
          documentType,
          title: req.body.title || req.file.originalname.replace(/\.[^/.]+$/, ""),
          storagePath,
          mimeType: validation.mimeType,
          fileSize: req.file.size,
          sha256: validation.sha256,
          issueDate: req.body.issueDate || null,
          expiryDate: req.body.expiryDate || null,
          verificationStatus,
          processingStatus: "uploaded",
          duplicateStatus: "unique",
          aiProcessed: false,
          certificateNumber: req.body.certificateNumber || null,
          institution: req.body.institution || null,
          recipientName: req.body.recipientName || req.user!.name || null,
          description: req.body.description || null,
          tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags]) : [],
          skills: req.body.skills ? (Array.isArray(req.body.skills) ? req.body.skills : [req.body.skills]) : [],
          confidence: 0,
          uncertainFields: [],
          uploadedAt: now,
          updatedAt: now,
        };

        const created = await storage.createDocument(docRecord);

        // Audit Log
        await storage.createAuditLog({
          userId,
          action: "DOCUMENT_UPLOADED",
          documentId: created.id,
          documentName: created.originalName,
          details: `Uploaded to category ${created.documentType} (${(created.fileSize / (1024 * 1024)).toFixed(2)} MB)`,
          timestamp: now,
          status: "SUCCESS",
        });

        // Background AI processing: immediately kicks off without blocking client
        const processPromise = processDocumentIntelligence(created.id, req.file.buffer);

        if (req.query.sync === "true") {
          const finalDoc = await processPromise;
          return res.status(201).json(finalDoc || created);
        } else {
          // Process in background
          processPromise.catch((err) => console.error(`[Background AI] Error on doc ${created.id}:`, err));
          return res.status(201).json(created);
        }
      } catch (err: any) {
        console.error("Upload error:", err);
        res.status(500).json({ message: err.message || "Failed to upload document" });
      }
    }
  );

  // 3b. Batch Upload documents
  app.post(
    "/api/documents/batch",
    requireAuth,
    (req, res, next) => {
      upload.array("files", 20)(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "One or more files exceed the 15MB limit." });
          }
          return res.status(400).json({ message: err.message });
        } else if (err) {
          return res.status(400).json({ message: err.message });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ message: "No files were uploaded." });
        }

        const userId = req.user!.id;
        const results: DocumentRecord[] = [];
        const now = new Date().toISOString();

        for (const file of files) {
          const validation = validateFileSecurity(file.buffer, file.originalname, file.mimetype);
          if (!validation.valid) continue;

          const ext = path.extname(file.originalname).toLowerCase();
          const documentId = randomUUID();
          const secureFileName = `${documentId}${ext}`;
          const documentType: DocumentCategory = "other";

          const storagePath = await storage.saveFile(
            userId,
            documentType,
            secureFileName,
            file.buffer
          );

          const docRecord: DocumentRecord = {
            id: documentId,
            ownerId: userId,
            fileName: secureFileName,
            originalName: file.originalname,
            documentType,
            title: file.originalname.replace(/\.[^/.]+$/, ""),
            storagePath,
            mimeType: validation.mimeType,
            fileSize: file.size,
            sha256: validation.sha256,
            verificationStatus: "Uploaded",
            processingStatus: "uploaded",
            duplicateStatus: "unique",
            aiProcessed: false,
            uploadedAt: now,
            updatedAt: now,
          };

          const created = await storage.createDocument(docRecord);
          results.push(created);

          // Dispatch background processing per document
          processDocumentIntelligence(created.id, file.buffer).catch((err) =>
            console.error(`[Background AI Batch] Error on doc ${created.id}:`, err)
          );
        }

        res.status(201).json({
          total: files.length,
          successful: results.length,
          documents: results,
        });
      } catch (err: any) {
        console.error("Batch upload error:", err);
        res.status(500).json({ message: err.message || "Batch upload failed" });
      }
    }
  );

  // 3c. Reprocess document with Gemini AI
  app.post("/api/documents/:id/reprocess", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id as string);
      if (!doc || doc.ownerId !== req.user!.id) {
        return res.status(404).json({ message: "Document not found" });
      }

      const fileBuffer = await storage.getFileBuffer(doc.storagePath);
      if (!fileBuffer) {
        return res.status(404).json({ message: "Physical document file not found in storage" });
      }
      
      // Update status to processing immediately for background processing
      const updated = await storage.updateDocument(doc.id, {
        processingStatus: "processing",
        updatedAt: new Date().toISOString(),
      });

      // Execute intelligence in background
      processDocumentIntelligence(doc.id, fileBuffer).catch((err) =>
        console.error(`[Background AI Reprocess] Error on doc ${doc.id}:`, err)
      );

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "DOCUMENT_REPROCESSED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "Document intelligence re-analysis initiated",
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to reprocess document" });
    }
  });

  // 3d. Review document resolution (Accept, Edit, Reclassify)
  app.post("/api/documents/:id/review", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id as string);
      if (!doc || doc.ownerId !== req.user!.id) {
        return res.status(404).json({ message: "Document not found" });
      }

      const { action, updates, ...directUpdates } = req.body;
      const combinedUpdates: any = {
        ...(updates || {}),
        ...directUpdates,
      };
      delete combinedUpdates.action;
      delete combinedUpdates.id;

      // If review changes category, relocate file to new category folder
      if (combinedUpdates.documentType && combinedUpdates.documentType !== doc.documentType && doc.storagePath) {
        const userFolder = await storage.getUserFolder(doc.ownerId);
        const fileName = path.basename(doc.storagePath);
        const newCategory = String(combinedUpdates.documentType).toLowerCase();
        const targetStoragePath = `users/${userFolder}/documents/${newCategory}/${fileName}`;
        if (doc.storagePath !== targetStoragePath) {
          try {
            await storage.moveFile(doc.storagePath, targetStoragePath);
            combinedUpdates.storagePath = targetStoragePath;
            console.log(`[Storage] Relocated file on human review reclassification: ${targetStoragePath}`);
          } catch (moveErr: any) {
            console.warn("[Storage] Warning moving file on review reclassification:", moveErr.message);
          }
        }
      }

      const now = new Date().toISOString();

      const updated = await storage.updateDocument(doc.id, {
        ...combinedUpdates,
        processingStatus: "completed",
        updatedAt: now,
      });

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "DOCUMENT_REVIEWED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Human review finalized with action: ${action || "accepted"}`,
        timestamp: now,
        status: "SUCCESS",
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to finalize review" });
    }
  });

  // 3e. Duplicate resolution (Keep Both or Replace)
  app.post("/api/documents/:id/resolve-duplicate", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id as string);
      if (!doc || doc.ownerId !== req.user!.id) {
        return res.status(404).json({ message: "Document not found" });
      }

      const { action, targetDocId } = req.body;
      const now = new Date().toISOString();

      if (action === "replace" && targetDocId) {
        const targetDoc = await storage.getDocument(targetDocId);
        if (targetDoc && targetDoc.ownerId === req.user!.id) {
          await storage.deleteFile(targetDoc.storagePath);
          await storage.deleteDocument(targetDoc.id);
        }
      }

      const updated = await storage.updateDocument(doc.id, {
        duplicateStatus: "unique",
        processingStatus: "completed",
        updatedAt: now,
      });

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "DUPLICATE_RESOLVED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Duplicate status resolved: ${action === "replace" ? "Replaced existing" : "Retained both"}`,
        timestamp: now,
        status: "SUCCESS",
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to resolve duplicate" });
    }
  });

  // 3f. Interactive Tag Addition and Removal
  app.post("/api/documents/:id/tags", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id as string);
      if (!doc || doc.ownerId !== req.user!.id) {
        return res.status(404).json({ message: "Document not found" });
      }

      const { tag, action, tags } = req.body;
      let currentTags = Array.isArray(doc.tags) ? [...doc.tags] : [];

      if (Array.isArray(tags)) {
        currentTags = Array.from(new Set(tags));
      } else if (tag && action === "remove") {
        currentTags = currentTags.filter((t) => t.toLowerCase() !== String(tag).toLowerCase());
      } else if (tag) {
        const cleanTag = String(tag).trim();
        if (cleanTag && !currentTags.some((t) => t.toLowerCase() === cleanTag.toLowerCase())) {
          currentTags.push(cleanTag);
        }
      }

      const updated = await storage.updateDocument(doc.id, {
        tags: currentTags,
        updatedAt: new Date().toISOString(),
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to update tags" });
    }
  });

  // 3f. Get all unique tags for user
  app.get("/api/documents-tags", requireAuth, async (req, res) => {
    try {
      const docs = await storage.getDocuments(req.user!.id);
      const tagSet = new Set<string>();
      for (const d of docs) {
        if (d.tags && Array.isArray(d.tags)) {
          d.tags.forEach((t) => tagSet.add(t));
        }
      }
      res.json(Array.from(tagSet));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to load tags" });
    }
  });

  // 4. Update document metadata
  app.patch("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id as string);
      if (!doc || doc.ownerId !== req.user!.id) {
        return res.status(404).json({ message: "Document not found" });
      }

      const parsed = updateDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const updated = await storage.updateDocument(doc.id, parsed.data);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "DOCUMENT_UPDATED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "Document metadata updated",
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to update document" });
    }
  });

  // 5. Delete document (Soft-Delete to 30-Day Trash Bin)
  app.delete("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id as string);
      if (!doc || doc.ownerId !== req.user!.id) {
        return res.status(404).json({ message: "Document not found" });
      }

      await storage.trashDocument(doc.id);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "DOCUMENT_TRASHED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "Document moved to 30-day trash bin",
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.sendStatus(204);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to move document to trash" });
    }
  });

  // Restore document from trash
  app.post("/api/documents/:id/restore", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id as string);
      if (!doc || doc.ownerId !== req.user!.id) {
        return res.status(404).json({ message: "Document not found" });
      }

      const restored = await storage.restoreDocument(doc.id);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "DOCUMENT_RESTORED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "Document restored from 30-day trash bin",
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json(restored);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to restore document" });
    }
  });

  // Permanently delete document (Purge)
  app.delete("/api/documents/:id/permanent", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id as string);
      if (!doc || doc.ownerId !== req.user!.id) {
        return res.status(404).json({ message: "Document not found" });
      }

      await storage.permanentDeleteDocument(doc.id);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "DOCUMENT_DELETED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "Document and storage assets permanently purged",
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.sendStatus(204);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to permanently purge document" });
    }
  });

  // Toggle Pin for Quick Access
  app.post("/api/documents/:id/pin", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id as string);
      if (!doc || doc.ownerId !== req.user!.id) {
        return res.status(404).json({ message: "Document not found" });
      }

      const updated = await storage.togglePinDocument(doc.id);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: updated?.isPinned ? "DOCUMENT_PINNED" : "DOCUMENT_UNPINNED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: updated?.isPinned ? "Pinned to Quick Access" : "Unpinned from Quick Access",
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to toggle pin" });
    }
  });

  // List Trash Bin
  app.get("/api/trash", requireAuth, async (req, res) => {
    try {
      const trashed = await storage.getTrashDocuments(req.user!.id);
      res.json(trashed);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch trash" });
    }
  });

  // Empty Trash Bin
  app.delete("/api/trash/empty", requireAuth, async (req, res) => {
    try {
      const count = await storage.emptyTrash(req.user!.id);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "TRASH_EMPTIED",
        details: `Purged ${count} trashed documents permanently`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.json({ deletedCount: count });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to empty trash" });
    }
  });

  // 6  // 12. Download document file
  app.get("/api/documents/:id/download", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id as string, req.user!.id);
      const isOwner = doc && (
        doc.ownerId === req.user!.id ||
        doc.ownerId === req.user!.email ||
        doc.ownerId === (req.user as any)?.username ||
        (req.user!.email && doc.ownerId === req.user!.email.replace(/[^a-z0-9_-]/g, "_"))
      );
      if (!doc || !isOwner || doc.isDeleted) {
        return res.status(404).json({ message: "Document not found" });
      }

      const fileBuffer = await storage.getFileBuffer(doc.storagePath);
      if (!fileBuffer) {
        return res.status(404).json({ message: "Physical file not found in storage" });
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "DOCUMENT_DOWNLOADED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "File downloaded",
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.set({
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.originalName)}"`,
        "Content-Length": String(fileBuffer.length),
      });
      return res.send(fileBuffer);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Download failed" });
    }
  });

  // 7. Preview document
  app.get("/api/documents/:id/preview", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id as string, req.user!.id);
      const isOwner = doc && (
        doc.ownerId === req.user!.id ||
        doc.ownerId === req.user!.email ||
        doc.ownerId === (req.user as any)?.username ||
        (req.user!.email && doc.ownerId === req.user!.email.replace(/[^a-z0-9_-]/g, "_"))
      );
      if (!doc || !isOwner || doc.isDeleted) {
        return res.status(404).json({ message: "Document not found" });
      }

      const fileBuffer = await storage.getFileBuffer(doc.storagePath);
      if (!fileBuffer) {
        return res.status(404).json({ message: "Physical file not found in storage" });
      }

      res.set({
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      });

      return res.send(fileBuffer);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Preview failed" });
    }
  });

  // ----------------------------------------------------
  // SECURE SHARING ENDPOINTS
  // ----------------------------------------------------

  // 1. List all shares created by authenticated user
  app.get("/api/shares", requireAuth, async (req, res) => {
    try {
      const shares = await storage.getUserShares(req.user!.id);
      res.json(shares);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to retrieve user shares" });
    }
  });

  // Helper to verify recipient email for a share
  function verifyShareEmailAccess(share: ShareRecord, req: Request): { authorized: boolean; error?: string; requiresEmail?: boolean } {
    if (share.status === "REVOKED") {
      return { authorized: false, error: "This share link has been revoked by the owner." };
    }
    const recipients = (share.recipientEmails || []).map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    if (recipients.length === 0) {
      return { authorized: true };
    }
    const providedEmail = (
      (req.query.email as string) ||
      (req.headers["x-recipient-email"] as string) ||
      (req.user as any)?.email ||
      ""
    ).trim().toLowerCase();

    if (!providedEmail) {
      return { authorized: false, requiresEmail: true, error: "Authorized recipient email is required to access this document." };
    }
    if (!recipients.includes(providedEmail)) {
      return { authorized: false, requiresEmail: true, error: "Access denied: This email is not authorized to view this document." };
    }
    return { authorized: true };
  }

  // 2. Create a secure share (Email-based)
  app.post("/api/shares", requireAuth, async (req, res) => {
    try {
      const parsed = createShareSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const { documentId, emails } = parsed.data;
      const doc = await storage.getDocument(documentId, req.user!.id);
      const isOwner = doc && (
        doc.ownerId === req.user!.id ||
        doc.ownerId === req.user!.email ||
        doc.ownerId === (req.user as any)?.username ||
        (req.user!.email && doc.ownerId === req.user!.email.replace(/[^a-z0-9_-]/g, "_"))
      );
      if (!doc || !isOwner) {
        return res.status(404).json({ message: "Document not found" });
      }

      const normalizedEmails = Array.from(
        new Set((emails || []).map((e: string) => e.trim().toLowerCase()).filter(Boolean))
      );
      if (normalizedEmails.length === 0) {
        return res.status(400).json({ message: "At least one recipient email address is required" });
      }

      // Generate secure unique share token
      const shareId = `fv_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const now = new Date().toISOString();

      const shareRecord: ShareRecord = {
        id: shareId,
        documentId: doc.id,
        ownerId: req.user!.id,
        documentName: doc.originalName,
        documentType: doc.documentType,
        recipientEmails: normalizedEmails,
        status: "ACTIVE",
        createdAt: now,
      };

      const created = await storage.createShare(shareRecord);

      // In-app notifications for registered recipients
      for (const email of normalizedEmails) {
        try {
          const recipientUser = await storage.getUserByEmail(email);
          if (recipientUser && recipientUser.id !== req.user!.id) {
            await storage.createNotification({
              userId: recipientUser.id,
              title: "Document Shared With You",
              message: `${req.user!.name || req.user!.username} shared "${doc.originalName}" with you.`,
              type: "share",
              read: false,
              createdAt: now,
            });
          }
        } catch {}
      }

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "DOCUMENT_SHARED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Document "${doc.originalName}" shared with ${normalizedEmails.join(", ")} (Share ID: ${shareId})`,
        timestamp: now,
        status: "SUCCESS",
      });

      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to create share link" });
    }
  });

  // 3. List shares for a document
  app.get("/api/shares/document/:documentId", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.documentId as string, req.user!.id);
      const isOwner = doc && (
        doc.ownerId === req.user!.id ||
        doc.ownerId === req.user!.email ||
        doc.ownerId === (req.user as any)?.username ||
        (req.user!.email && doc.ownerId === req.user!.email.replace(/[^a-z0-9_-]/g, "_"))
      );
      if (!doc || !isOwner) {
        return res.status(404).json({ message: "Document not found" });
      }

      const shares = await storage.getSharesForDocument(doc.id, req.user!.id);
      res.json(shares);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to retrieve shares" });
    }
  });

  // 3. Revoke share
  app.delete("/api/shares/:id", requireAuth, async (req, res) => {
    try {
      const share = await storage.getShare(req.params.id as string);
      if (!share || share.ownerId !== req.user!.id) {
        return res.status(404).json({ message: "Share link not found" });
      }

      await storage.updateShare(share.id, { status: "REVOKED" });

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "SHARE_REVOKED",
        documentId: share.documentId,
        details: `Share ${share.id} revoked`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      res.sendStatus(204);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to revoke share" });
    }
  });

  // 4. Shared Document Preview (Controlled Access by Email)
  app.get("/api/shares/:id/preview", async (req, res) => {
    try {
      const share = await storage.getShare(req.params.id);
      if (!share) {
        return res.status(404).json({ message: "Share link not found" });
      }

      const emailCheck = verifyShareEmailAccess(share, req);
      if (!emailCheck.authorized) {
        return res.status(403).json({ message: emailCheck.error });
      }

      const doc = await storage.getDocument(share.documentId);
      if (!doc) {
        return res.status(404).json({ message: "Associated document no longer exists." });
      }

      // Increment access counter
      await storage.updateShare(share.id, { accessCount: (share.accessCount || 0) + 1 });

      const providedEmail = (req.query.email as string || req.headers["x-recipient-email"] as string || (req.user as any)?.email || "").trim();
      await storage.createAuditLog({
        userId: share.ownerId,
        action: "SHARE_ACCESSED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Recipient (${providedEmail || "Authorized"}) previewed shared document via token ${share.id}`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      const fileBuffer = await storage.getFileBuffer(doc.storagePath);
      if (!fileBuffer) {
        return res.status(404).json({ message: "Shared document file not found in storage" });
      }

      res.set({
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "public, max-age=86400",
      });
      return res.send(fileBuffer);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to preview shared document" });
    }
  });

  // 5. Shared Document Download (Controlled Access by Email)
  app.get("/api/shares/:id/download", async (req, res) => {
    try {
      const share = await storage.getShare(req.params.id);
      if (!share) {
        return res.status(404).json({ message: "Share link not found" });
      }

      const emailCheck = verifyShareEmailAccess(share, req);
      if (!emailCheck.authorized) {
        return res.status(403).json({ message: emailCheck.error });
      }

      const doc = await storage.getDocument(share.documentId);
      if (!doc) {
        return res.status(404).json({ message: "Document not found." });
      }

      await storage.updateShare(share.id, { accessCount: (share.accessCount || 0) + 1 });

      const providedEmail = (req.query.email as string || req.headers["x-recipient-email"] as string || (req.user as any)?.email || "").trim();
      await storage.createAuditLog({
        userId: share.ownerId,
        action: "DOCUMENT_DOWNLOADED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Recipient (${providedEmail || "Authorized"}) downloaded document via share link ${share.id}`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      const fileBuffer = await storage.getFileBuffer(doc.storagePath);
      if (!fileBuffer) {
        return res.status(404).json({ message: "Shared document file not found in storage" });
      }

      res.set({
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.originalName)}"`,
        "Content-Length": String(fileBuffer.length),
      });
      return res.send(fileBuffer);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Download failed" });
    }
  });

  // ----------------------------------------------------
  // CONTROLLED PUBLIC VERIFICATION ENDPOINT (Email-Based Access)
  // ----------------------------------------------------
  app.get("/api/verify/:shareId", async (req, res) => {
    try {
      const share = await storage.getShare(req.params.shareId);
      if (!share) {
        return res.status(404).json({ message: "Verification record not found or invalid." });
      }

      if (share.status === "REVOKED") {
        return res.status(403).json({
          message: "This document share link has been revoked by the document owner.",
          shareStatus: "REVOKED",
        });
      }

      const doc = await storage.getDocument(share.documentId);
      if (!doc) {
        return res.status(404).json({ message: "Associated document record no longer exists." });
      }

      const recipients = (share.recipientEmails || []).map((e: string) => e.trim().toLowerCase()).filter(Boolean);
      const providedEmail = (
        (req.query.email as string) ||
        (req.headers["x-recipient-email"] as string) ||
        (req.user as any)?.email ||
        ""
      ).trim().toLowerCase();

      // If recipients are restricted and no email provided
      if (recipients.length > 0 && !providedEmail) {
        return res.json({
          requiresEmail: true,
          verificationId: `FV-${share.id.replace(/^fv_/, "").toUpperCase().slice(0, 8)}`,
          originalName: doc.originalName,
          documentType: doc.documentType,
          recipientName: doc.recipientName || "Authorized Holder",
          institution: doc.institution || "Registered Authority",
          status: doc.verificationStatus,
          shareStatus: share.status,
          message: "Authorized recipient email required to view this document.",
        });
      }

      // If recipients are restricted and provided email does NOT match
      if (recipients.length > 0 && !recipients.includes(providedEmail)) {
        return res.status(403).json({
          requiresEmail: true,
          emailUnauthorized: true,
          verificationId: `FV-${share.id.replace(/^fv_/, "").toUpperCase().slice(0, 8)}`,
          originalName: doc.originalName,
          documentType: doc.documentType,
          message: "Access denied: This email is not authorized to access this document.",
        });
      }

      // Log verification attempt
      await storage.createAuditLog({
        userId: share.ownerId,
        action: "VERIFICATION_REQUESTED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Credential verification viewed for FV-${share.id.toUpperCase().slice(0, 8)}${providedEmail ? ` by ${providedEmail}` : ""}`,
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      const emailParam = providedEmail ? `?email=${encodeURIComponent(providedEmail)}` : "";

      // Tamper-evident, sanitized public verification response
      res.json({
        verificationId: `FV-${share.id.replace(/^fv_/, "").toUpperCase().slice(0, 8)}`,
        documentType: doc.documentType,
        recipientName: doc.recipientName || "Authorized Holder",
        institution: doc.institution || "Registered Authority",
        issueDate: doc.issueDate || null,
        expiryDate: doc.expiryDate || null,
        certificateNumber: doc.certificateNumber || null,
        status: doc.verificationStatus,
        shareStatus: share.status,
        permission: "both",
        isExpired: false,
        canViewFile: true,
        canDownload: true,
        filePreviewUrl: `/api/shares/${share.id}/preview${emailParam}`,
        downloadUrl: `/api/shares/${share.id}/download${emailParam}`,
        mimeType: doc.mimeType || null,
        originalName: doc.originalName || null,
        requiresEmail: false,
        authorizedEmail: providedEmail || null,
        recipientEmails: share.recipientEmails || [],
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Verification request failed" });
    }
  });

  // ----------------------------------------------------
  // AUDIT LOGS ENDPOINT
  // ----------------------------------------------------
  app.get("/api/audit-logs", requireAuth, async (req, res) => {
    try {
      const logs = await storage.getAuditLogs(req.user!.id);

      const isExportAll = req.query.all === "true" || req.query.export === "true";
      if (isExportAll) {
        return res.json(logs);
      }

      // Actions corresponding to upload, delete, and share
      const activityActions = new Set([
        "DOCUMENT_UPLOADED",
        "UPLOAD",
        "DOCUMENT_TRASHED",
        "DOCUMENT_DELETED",
        "DELETE",
        "DOCUMENT_SHARED",
        "SHARE",
        "SHARE_CREATED",
      ]);

      if (req.query.activity === "true" || req.query.filter === "activity" || req.query.type === "recent") {
        const filtered = logs.filter((log) => log.action && activityActions.has(log.action.toUpperCase()));
        return res.json(filtered);
      }

      if (req.query.actions) {
        const requested = new Set(
          String(req.query.actions)
            .split(",")
            .map((a) => a.trim().toUpperCase())
        );
        const filtered = logs.filter((log) => log.action && requested.has(log.action.toUpperCase()));
        return res.json(filtered);
      }

      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch audit logs" });
    }
  });

  // ----------------------------------------------------
  // DASHBOARD STATS ENDPOINT
  // ----------------------------------------------------
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const docs = await storage.getDocuments(userId);

      const now = new Date();
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);

      const totalDocuments = docs.length;
      const totalCertificates = docs.filter((d) => d.documentType === "certificate" || d.documentType === "certificates" || d.documentType === "professional").length;
      const totalAchievements = docs.filter((d) => d.documentType === "achievement" || d.documentType === "hackathon").length;
      const totalHackathons = docs.filter((d) => d.documentType === "hackathon" || d.subType === "hackathon" || (d.tags && d.tags.includes("Hackathon"))).length;
      const totalEducation = docs.filter((d) => d.documentType === "education" || d.documentType === "degree" || d.documentType === "marksheet").length;
      const totalExperience = docs.filter((d) => d.documentType === "internship" || d.documentType === "employment" || d.documentType === "offer_letter" || d.documentType === "experience_letter").length;
      const totalResumes = docs.filter((d) => d.documentType === "resume").length;
      const totalCourses = docs.filter((d) => d.documentType === "course" || d.documentType === "workshop").length;
      const totalIdentity = docs.filter((d) => d.documentType === "identity" || d.documentType === "government").length;
      const totalOther = docs.filter((d) => d.documentType === "other" || d.documentType === "project" || d.documentType === "participation").length;

      const needsReviewCount = docs.filter((d) => d.processingStatus === "review_required").length;
      const duplicateCount = docs.filter((d) => d.duplicateStatus === "exact_duplicate" || d.duplicateStatus === "possible_duplicate").length;
      const verifiedDocuments = docs.filter((d) => d.verificationStatus === "Verified").length;

      const expiringSoon = docs.filter((d) => {
        if (!d.expiryDate) return false;
        const exp = new Date(d.expiryDate);
        return exp > now && exp <= in30Days;
      }).length;

      const totalStorageBytes = docs.reduce((acc, d) => acc + (d.fileSize || 0), 0);

      // Shared documents count
      let sharedCount = 0;
      for (const d of docs) {
        const shares = await storage.getSharesForDocument(d.id, userId);
        if (shares.some((s) => s.status === "ACTIVE")) {
          sharedCount++;
        }
      }

      res.json({
        total: totalDocuments,
        totalDocuments,
        totalCertificates,
        totalAchievements,
        totalHackathons,
        totalEducation,
        totalExperience,
        totalResumes,
        totalCourses,
        totalIdentity,
        totalOther,
        byCategory: {
          certificates: totalCertificates,
          achievements: totalAchievements,
          hackathons: totalHackathons,
          education: totalEducation,
          experience: totalExperience,
          resumes: totalResumes,
          courses: totalCourses,
          identity: totalIdentity,
          other: totalOther,
        },
        byProcessingStatus: {
          uploaded: docs.filter((d) => d.processingStatus === "uploaded").length,
          processing: docs.filter((d) => d.processingStatus === "processing").length,
          review_required: needsReviewCount,
          completed: docs.filter((d) => d.processingStatus === "completed").length,
          duplicate: duplicateCount,
        },
        needsReviewCount,
        duplicateCount,
        duplicatesCount: duplicateCount,
        expiringSoon,
        verifiedDocuments,
        sharedDocuments: sharedCount,
        totalStorageBytes,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to load dashboard metrics" });
    }
  });

  // ----------------------------------------------------
  // NOTIFICATIONS ENDPOINTS
  // ----------------------------------------------------
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const list = await storage.getNotifications(req.user!.id);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const success = await storage.markNotificationRead(req.params.id as string, req.user!.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to update notification" });
    }
  });

  return httpServer;
}