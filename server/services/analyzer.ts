import { createHash } from "crypto";
import path from "path";
import { DocumentRecord, GeminiDocumentExtraction, ProcessingStatus, DuplicateStatus, DocumentCategory } from "@shared/schema";
import { storage } from "../storage";
import { analyzeDocumentWithGemini } from "./gemini";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sha256: string;
  mimeType: string;
}

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".docx",
];

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit

/**
 * Pre-AI Security and Integrity Check
 */
export function validateFileSecurity(
  buffer: Buffer,
  originalName: string,
  declaredMimeType: string
): FileValidationResult {
  // 1. Non-empty check
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty file received. File has 0 bytes.", sha256: "", mimeType: declaredMimeType };
  }

  // 2. File size limit
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: `File exceeds maximum allowed size of 15MB (${(buffer.length / (1024 * 1024)).toFixed(2)}MB).`, sha256: "", mimeType: declaredMimeType };
  }

  // 3. Extension check
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Unsupported file extension: ${ext}. Supported: PDF, PNG, JPG, JPEG, WEBP, DOCX.`, sha256: "", mimeType: declaredMimeType };
  }

  // 4. MIME type check
  const normalizedMime = declaredMimeType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    return { valid: false, error: `Unsupported MIME type: ${declaredMimeType}.`, sha256: "", mimeType: declaredMimeType };
  }

  // 5. Basic signature / magic number check to prevent renamed executables or corrupted headers
  if (ext === ".pdf") {
    const header = buffer.toString("utf-8", 0, 5);
    if (!header.startsWith("%PDF-")) {
      return { valid: false, error: "Corrupt or invalid PDF file header.", sha256: "", mimeType: declaredMimeType };
    }
  } else if (ext === ".png") {
    if (buffer.length < 8 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
      return { valid: false, error: "Corrupt or invalid PNG image file.", sha256: "", mimeType: declaredMimeType };
    }
  } else if (ext === ".jpg" || ext === ".jpeg") {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return { valid: false, error: "Corrupt or invalid JPEG image file.", sha256: "", mimeType: declaredMimeType };
    }
  }

  // 6. SHA-256 generation
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  return {
    valid: true,
    sha256,
    mimeType: normalizedMime,
  };
}

/**
 * Checks for duplicate documents within the user's vault
 */
export async function checkDuplicates(
  userId: string,
  sha256: string,
  extraction: GeminiDocumentExtraction,
  currentDocId?: string
): Promise<{ status: DuplicateStatus; duplicateOf?: DocumentRecord }> {
  const existingDocs = await storage.getDocuments(userId);

  // Exact duplicate: compare SHA-256 hash
  const exact = existingDocs.find(
    (d) =>
      d.id !== currentDocId &&
      d.duplicateOfId !== currentDocId &&
      d.sha256 &&
      d.sha256 === sha256
  );
  if (exact) {
    return { status: "exact_duplicate", duplicateOf: exact };
  }

  // Similar duplicate: compare metadata similarity (title + organization + person + date)
  if (extraction.title && extraction.organization) {
    const similar = existingDocs.find((d) => {
      if (d.id === currentDocId) return false;
      const titleMatch = d.title && d.title.toLowerCase() === extraction.title?.toLowerCase();
      const orgMatch = d.organization && d.organization.toLowerCase() === extraction.organization?.toLowerCase();
      const personMatch = (!d.personName && !extraction.person?.name) ||
        (d.personName && extraction.person?.name && d.personName.toLowerCase() === extraction.person.name.toLowerCase());
      const dateMatch = (!d.issueDate && !extraction.dates?.issueDate) ||
        (d.issueDate && extraction.dates?.issueDate && d.issueDate === extraction.dates.issueDate);

      return (titleMatch && orgMatch) || (titleMatch && personMatch && dateMatch);
    });

    if (similar) {
      return { status: "possible_duplicate", duplicateOf: similar };
    }
  }

  return { status: "unique" };
}

/**
 * Executes full Document Intelligence pipeline on a document
 */
export async function processDocumentIntelligence(
  documentId: string,
  buffer: Buffer
): Promise<DocumentRecord | undefined> {
  const doc = await storage.getDocument(documentId);
  if (!doc) return undefined;

  const now = new Date().toISOString();

  // 1. Mark as processing
  await storage.updateDocument(doc.id, {
    processingStatus: "processing",
    updatedAt: now,
  });

  try {
    // 2. Pre-AI Security and SHA-256 Validation
    const validation = validateFileSecurity(buffer, doc.originalName, doc.mimeType);
    if (!validation.valid) {
      const failedDoc = await storage.updateDocument(doc.id, {
        processingStatus: "failed",
        description: `Security validation error: ${validation.error}`,
        updatedAt: new Date().toISOString(),
      });
      return failedDoc;
    }

    const sha256 = validation.sha256;

    // 3. Exact Duplicate Pre-check (Saves Gemini free quota!)
    const exactCheck = await checkDuplicates(doc.ownerId, sha256, {
      documentType: doc.documentType,
      subType: null,
      title: doc.originalName,
      person: { name: null },
      organization: null,
      dates: { issueDate: null, expiryDate: null },
      skills: [],
      tags: [],
      confidence: 1.0,
      uncertainFields: [],
    }, doc.id);

    if (exactCheck.status === "exact_duplicate") {
      console.log(`[Document Intelligence] Exact duplicate detected for doc ${doc.id} (matches ${exactCheck.duplicateOf?.id}). Skipping Gemini API call.`);
      const updated = await storage.updateDocument(doc.id, {
        sha256,
        processingStatus: "duplicate",
        duplicateStatus: "exact_duplicate",
        duplicateOfId: exactCheck.duplicateOf?.id || null,
        title: exactCheck.duplicateOf?.title || doc.originalName,
        documentType: exactCheck.duplicateOf?.documentType || doc.documentType,
        subType: exactCheck.duplicateOf?.subType,
        personName: exactCheck.duplicateOf?.personName,
        organization: exactCheck.duplicateOf?.organization,
        tags: exactCheck.duplicateOf?.tags || ["Duplicate"],
        skills: exactCheck.duplicateOf?.skills || [],
        confidence: exactCheck.duplicateOf?.confidence || 1.0,
        aiProcessed: true,
        updatedAt: new Date().toISOString(),
      });

      await storage.createAuditLog({
        userId: doc.ownerId,
        action: "DOCUMENT_AI_PROCESSED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Exact duplicate detected via SHA-256 (matches ${exactCheck.duplicateOf?.originalName})`,
        timestamp: new Date().toISOString(),
        status: "WARNING",
      });

      return updated;
    }

    // 4. Gemini 3.5 Flash Single-Shot Multimodal Intelligence Call
    const extraction = await analyzeDocumentWithGemini(buffer, validation.mimeType, doc.originalName);

    // 5. Check for similar duplicate based on extracted metadata
    const duplicateCheck = await checkDuplicates(doc.ownerId, sha256, extraction, doc.id);

    // 6. Confidence and Review Evaluation
    // Thresholds:
    // >= 0.85 and no critical uncertain fields -> "completed"
    // 0.60 - 0.84 or uncertain fields -> "review_required"
    // < 0.60 -> "review_required"
    let processingStatus: ProcessingStatus = "completed";
    if (extraction.confidence < 0.85 || (extraction.uncertainFields && extraction.uncertainFields.length > 0)) {
      processingStatus = "review_required";
    }

    if (duplicateCheck.status === "possible_duplicate") {
      processingStatus = "review_required";
    }

    // 7. Organize Tags and Fields
    const resolvedTags = Array.from(
      new Set([
        ...(doc.tags || []),
        ...(extraction.tags || []),
        extraction.documentType,
        ...(extraction.subType ? [extraction.subType] : []),
      ])
    ).filter(Boolean);

    // Format date string safely
    const issueDate = doc.issueDate || extraction.dates?.issueDate || null;
    const expiryDate = doc.expiryDate || extraction.dates?.expiryDate || null;

    // If user already specified a category other than "other", preserve user's explicit choice
    const finalDocumentType = (doc.documentType && doc.documentType !== "other")
      ? doc.documentType
      : ((extraction.documentType as DocumentCategory) || "other");

    // Relocate file to the clarified category folder under user's directory if clarified
    let resolvedStoragePath = doc.storagePath;
    if (finalDocumentType && doc.storagePath && !doc.storagePath.includes(`/documents/${finalDocumentType}/`)) {
      const userFolder = await storage.getUserFolder(doc.ownerId);
      const fileName = path.basename(doc.storagePath);
      const targetStoragePath = `users/${userFolder}/documents/${finalDocumentType}/${fileName}`;
      try {
        await storage.moveFile(doc.storagePath, targetStoragePath);
        resolvedStoragePath = targetStoragePath;
        console.log(`[Storage] Relocated document ${doc.id} to clarified category folder: ${targetStoragePath}`);
      } catch (moveErr: any) {
        console.warn(`[Storage] Could not relocate file to ${targetStoragePath}:`, moveErr.message);
      }
    }

    const updatedDoc = await storage.updateDocument(doc.id, {
      sha256,
      documentType: finalDocumentType,
      storagePath: resolvedStoragePath,
      subType: extraction.subType || doc.subType,
      title: doc.title && doc.title !== doc.originalName ? doc.title : (extraction.title || doc.originalName.replace(/\.[^/.]+$/, "")),
      personName: doc.recipientName || extraction.person?.name || null,
      organization: doc.institution || extraction.organization || null,
      recipientName: doc.recipientName || extraction.person?.name || null,
      institution: doc.institution || extraction.organization || null,
      issueDate,
      expiryDate,
      achievement: extraction.achievement?.description || extraction.achievement?.type || doc.achievement || null,
      rank: extraction.achievement?.rank || doc.rank || null,
      skills: extraction.skills || [],
      tags: resolvedTags,
      confidence: extraction.confidence,
      uncertainFields: extraction.uncertainFields,
      processingStatus,
      duplicateStatus: duplicateCheck.status,
      aiProcessed: true,
      aiRawResponse: extraction,
      educationDetails: extraction.education || null,
      employmentDetails: extraction.employment || null,
      updatedAt: new Date().toISOString(),
    });

    // 8. Create Audit Log and In-App Notification
    await storage.createAuditLog({
      userId: doc.ownerId,
      action: "DOCUMENT_AI_PROCESSED",
      documentId: doc.id,
      documentName: doc.originalName,
      details: `AI classification: ${extraction.documentType}${extraction.subType ? ` (${extraction.subType})` : ""} - Confidence: ${(extraction.confidence * 100).toFixed(0)}%`,
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    });

    await storage.createNotification({
      userId: doc.ownerId,
      title: processingStatus === "review_required" ? "Document Needs Review" : "Document Analyzed & Vaulted",
      message: processingStatus === "review_required"
        ? `"${doc.originalName}" was classified as ${extraction.documentType}, but requires review (${(extraction.confidence * 100).toFixed(0)}% confidence).`
        : `"${doc.originalName}" was organized under ${extraction.documentType}.`,
      type: "ai",
      read: false,
      createdAt: new Date().toISOString(),
    });

    return updatedDoc;
  } catch (err: any) {
    console.error(`[Document Intelligence] Error processing document ${doc.id}:`, err);
    return await storage.updateDocument(doc.id, {
      processingStatus: "failed",
      description: `AI processing encountered an error: ${err.message}`,
      updatedAt: new Date().toISOString(),
    });
  }
}
