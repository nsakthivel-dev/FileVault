import { pgTable, text, varchar, serial, timestamp, bigint, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Sessions table (retained for backward compatibility)
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// Users table (retained for backward compatibility)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Documents table (retained for backward compatibility)
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey(),
  userId: serial("user_id").references(() => users.id, { onDelete: "cascade" }),
  originalName: text("original_name").notNull(),
  storedPath: text("stored_path").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address").optional(),
  name: z.string().min(1, "Name is required").optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Document categories
export const DocumentCategories = [
  "resume",
  "certificate",
  "achievement",
  "hackathon",
  "education",
  "marksheet",
  "degree",
  "internship",
  "employment",
  "offer_letter",
  "experience_letter",
  "course",
  "workshop",
  "project",
  "participation",
  "identity",
  "certificates",
  "professional",
  "government",
  "other",
] as const;

export type DocumentCategory = (typeof DocumentCategories)[number];

// Processing statuses for AI pipeline
export const ProcessingStatuses = [
  "uploaded",
  "processing",
  "review_required",
  "completed",
  "failed",
  "duplicate",
] as const;

export type ProcessingStatus = (typeof ProcessingStatuses)[number];

// Duplicate detection statuses
export const DuplicateStatuses = [
  "unique",
  "exact_duplicate",
  "possible_duplicate",
] as const;

export type DuplicateStatus = (typeof DuplicateStatuses)[number];

// Verification statuses (retained for backward compatibility)
export const VerificationStatuses = [
  "Uploaded",
  "Processing",
  "Verified",
  "Unverified",
  "Rejected",
  "Expired",
] as const;

export type VerificationStatus = (typeof VerificationStatuses)[number];

// Share statuses
export const ShareStatuses = [
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "LIMIT_REACHED",
] as const;

export type ShareStatus = (typeof ShareStatuses)[number];

// Audit actions
export const AuditActions = [
  "LOGIN",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_VIEWED",
  "DOCUMENT_DOWNLOADED",
  "DOCUMENT_UPDATED",
  "DOCUMENT_DELETED",
  "DOCUMENT_TRASHED",
  "DOCUMENT_RESTORED",
  "DOCUMENT_PINNED",
  "DOCUMENT_UNPINNED",
  "TRASH_EMPTIED",
  "DOCUMENT_SHARED",
  "SHARE_ACCESSED",
  "SHARE_REVOKED",
  "VERIFICATION_REQUESTED",
  "DOCUMENT_AI_PROCESSED",
  "DOCUMENT_REPROCESSED",
  "DOCUMENT_REVIEWED",
  "DUPLICATE_RESOLVED",
] as const;

export type AuditAction = (typeof AuditActions)[number];

// Structured Gemini AI Extraction Schema
export interface GeminiDocumentExtraction {
  documentType: DocumentCategory | string;
  subType: string | null;
  title: string | null;
  person: {
    name: string | null;
  };
  organization: string | null;
  dates: {
    issueDate: string | null;
    expiryDate: string | null;
  };
  achievement?: {
    type: string | null;
    rank: string | null;
    description: string | null;
  } | null;
  education?: {
    degree: string | null;
    institution: string | null;
    year: string | null;
  } | null;
  employment?: {
    company: string | null;
    role: string | null;
    startDate: string | null;
    endDate: string | null;
  } | null;
  skills: string[];
  tags: string[];
  confidence: number;
  uncertainFields: string[];
}

// Firestore / API Models
export interface UserRecord {
  id: string; // Firebase UID or local ID
  username: string;
  email: string;
  name?: string;
  profileImage?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentRecord {
  id: string;
  ownerId: string;
  fileName: string;
  originalName: string;
  documentType: DocumentCategory;
  subType?: string | null;
  title?: string | null;
  personName?: string | null;
  organization?: string | null;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  sha256?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  achievement?: string | null;
  rank?: string | null;
  skills?: string[];
  tags?: string[];
  confidence?: number;
  uncertainFields?: string[];
  processingStatus: ProcessingStatus;
  duplicateStatus?: DuplicateStatus;
  duplicateOfId?: string | null;
  aiProcessed?: boolean;
  aiRawResponse?: any;
  educationDetails?: { degree?: string | null; institution?: string | null; year?: string | null } | null;
  employmentDetails?: { company?: string | null; role?: string | null; startDate?: string | null; endDate?: string | null } | null;
  verificationStatus: VerificationStatus;
  certificateNumber?: string | null;
  institution?: string | null;
  recipientName?: string | null;
  description?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  isPinned?: boolean;
  pinnedAt?: string | null;
  uploadedAt: string;
  updatedAt?: string;
}

export interface ShareRecord {
  id: string;
  documentId: string;
  ownerId: string;
  documentName?: string;
  documentType?: DocumentCategory;
  expiresAt: string | null; // ISO string or null for no expiry
  accessLimit: number | null; // number or null for unlimited
  accessCount: number;
  status: ShareStatus;
  allowedFields?: string[];
  permission?: "view" | "download" | "both";
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLogRecord {
  id: string;
  userId: string;
  action: AuditAction;
  documentId?: string | null;
  documentName?: string | null;
  details?: any;
  timestamp: string;
  status: "SUCCESS" | "FAILURE" | "WARNING";
  ipAddress?: string | null;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "upload" | "expiry" | "share" | "system" | "ai";
  read: boolean;
  createdAt: string;
}

// Zod schemas for input validation
export const createDocumentSchema = z.object({
  originalName: z.string().min(1, "File name is required"),
  documentType: z.string().default("other"),
  subType: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  personName: z.string().optional().nullable(),
  organization: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  certificateNumber: z.string().optional().nullable(),
  institution: z.string().optional().nullable(),
  recipientName: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
});

export const updateDocumentSchema = z.object({
  originalName: z.string().min(1, "File name is required").optional(),
  documentType: z.enum(DocumentCategories).optional(),
  subType: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  personName: z.string().optional().nullable(),
  organization: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  achievement: z.string().optional().nullable(),
  rank: z.string().optional().nullable(),
  certificateNumber: z.string().optional().nullable(),
  institution: z.string().optional().nullable(),
  recipientName: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  skills: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  verificationStatus: z.enum(VerificationStatuses).optional(),
  processingStatus: z.enum(ProcessingStatuses).optional(),
  duplicateStatus: z.enum(DuplicateStatuses).optional(),
});

export const createShareSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  expiresInHours: z.number().nullable().optional(), // e.g. 1, 24, 168 (7d), 720 (30d), null
  accessLimit: z.number().int().positive().nullable().optional(), // e.g. 1, 5, 10, null
  allowedFields: z.array(z.string()).optional(),
  permission: z.enum(["view", "download", "both"]).optional().default("both"),
});

export type CreateShareInput = z.infer<typeof createShareSchema>;

// Public verification response schema
export interface PublicVerificationResponse {
  verificationId: string;
  documentType: string;
  recipientName?: string;
  institution?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  certificateNumber?: string | null;
  status: VerificationStatus;
  shareStatus: ShareStatus;
  isExpired: boolean;
  canViewFile: boolean;
  canDownload?: boolean;
  permission?: "view" | "download" | "both";
  filePreviewUrl?: string | null;
  downloadUrl?: string | null;
}

// Compatibility mappings
export type User = UserRecord;
export type Document = DocumentRecord;
export type DocumentResponse = DocumentRecord;
export type DocumentsListResponse = DocumentRecord[];
