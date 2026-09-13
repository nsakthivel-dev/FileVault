import { 
  UserRecord, 
  DocumentRecord, 
  ShareRecord, 
  AuditLogRecord, 
  NotificationRecord, 
  InsertUser 
} from "@shared/schema";
import { getSupabaseAdmin, getSupabaseBucketName } from "./supabase";
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<UserRecord | undefined>;
  getUserByUsername(username: string): Promise<(UserRecord & { password?: string }) | undefined>;
  createUser(user: { id?: string; username: string; passwordHash: string; email?: string; name?: string }): Promise<UserRecord>;
  ensureUserFolder(userId: string): Promise<void>;

  // Documents
  getDocuments(userId: string, includeDeleted?: boolean): Promise<DocumentRecord[]>;
  getTrashDocuments(userId: string): Promise<(DocumentRecord & { daysRemaining: number })[]>;
  trashDocument(id: string): Promise<DocumentRecord | undefined>;
  restoreDocument(id: string): Promise<DocumentRecord | undefined>;
  permanentDeleteDocument(id: string): Promise<void>;
  emptyTrash(userId: string): Promise<number>;
  togglePinDocument(id: string): Promise<DocumentRecord | undefined>;
  getDocument(id: string): Promise<DocumentRecord | undefined>;
  findDocumentBySha256(userId: string, sha256: string): Promise<DocumentRecord | undefined>;
  createDocument(doc: DocumentRecord): Promise<DocumentRecord>;
  updateDocument(id: string, updates: Partial<DocumentRecord>): Promise<DocumentRecord | undefined>;
  deleteDocument(id: string): Promise<void>;
  replaceDocument(oldDocId: string, newDoc: DocumentRecord): Promise<DocumentRecord>;

  // Shares
  createShare(share: ShareRecord): Promise<ShareRecord>;
  getShare(id: string): Promise<ShareRecord | undefined>;
  getSharesForDocument(documentId: string, ownerId: string): Promise<ShareRecord[]>;
  getUserShares(ownerId: string): Promise<ShareRecord[]>;
  updateShare(id: string, updates: Partial<ShareRecord>): Promise<ShareRecord | undefined>;
  deleteShare(id: string): Promise<void>;

  // Audit Logs
  createAuditLog(log: Omit<AuditLogRecord, "id">): Promise<AuditLogRecord>;
  getAuditLogs(userId: string): Promise<AuditLogRecord[]>;

  // Notifications
  getNotifications(userId: string): Promise<NotificationRecord[]>;
  createNotification(notif: Omit<NotificationRecord, "id">): Promise<NotificationRecord>;
  markNotificationRead(id: string, userId: string): Promise<boolean>;

  // File Storage
  saveFile(userId: string, category: string, fileName: string, buffer: Buffer): Promise<string>;
  moveFile(oldStoragePath: string, newStoragePath: string): Promise<void>;
  getUserFolder(userId: string): Promise<string>;
  createUserFolder(folderName: string): Promise<void>;
  getFilePath(storagePath: string): string;
  deleteFile(storagePath: string): Promise<void>;
}

// Helpers to map between TS DocumentRecord (camelCase) and Postgres/Supabase (snake_case)
function mapDocToSupabase(doc: DocumentRecord) {
  return {
    id: doc.id,
    owner_id: doc.ownerId,
    file_name: doc.fileName,
    original_name: doc.originalName,
    document_type: doc.documentType,
    sub_type: doc.subType || null,
    title: doc.title || null,
    person_name: doc.personName || null,
    organization: doc.organization || null,
    storage_path: doc.storagePath,
    mime_type: doc.mimeType,
    file_size: doc.fileSize,
    sha256: doc.sha256 || null,
    issue_date: doc.issueDate || null,
    expiry_date: doc.expiryDate || null,
    achievement: doc.achievement || null,
    rank: doc.rank || null,
    skills: doc.skills || [],
    tags: doc.tags || [],
    confidence: doc.confidence || 0,
    uncertain_fields: doc.uncertainFields || [],
    verification_status: doc.verificationStatus || "Uploaded",
    processing_status: doc.processingStatus || "uploaded",
    duplicate_status: doc.duplicateStatus || "unique",
    duplicate_of_id: doc.duplicateOfId || null,
    ai_processed: Boolean(doc.aiProcessed),
    ai_raw_response: doc.aiRawResponse || null,
    education_details: doc.educationDetails || null,
    employment_details: doc.employmentDetails || null,
    recipient_name: doc.recipientName || null,
    institution: doc.institution || null,
    certificate_number: doc.certificateNumber || null,
    description: doc.description || null,
    is_deleted: Boolean(doc.isDeleted),
    deleted_at: doc.deletedAt || null,
    is_pinned: Boolean(doc.isPinned),
    pinned_at: doc.pinnedAt || null,
    uploaded_at: doc.uploadedAt || new Date().toISOString(),
    updated_at: doc.updatedAt || new Date().toISOString(),
  };
}

function mapDocFromSupabase(row: any): DocumentRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    fileName: row.file_name,
    originalName: row.original_name,
    documentType: row.document_type,
    subType: row.sub_type,
    title: row.title,
    personName: row.person_name,
    organization: row.organization,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    sha256: row.sha256,
    issueDate: row.issue_date,
    expiryDate: row.expiry_date,
    achievement: row.achievement,
    rank: row.rank,
    skills: Array.isArray(row.skills) ? row.skills : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    confidence: Number(row.confidence || 0),
    uncertainFields: Array.isArray(row.uncertain_fields) ? row.uncertain_fields : [],
    verificationStatus: row.verification_status,
    processingStatus: row.processing_status,
    duplicateStatus: row.duplicate_status,
    duplicateOfId: row.duplicate_of_id,
    aiProcessed: row.ai_processed,
    aiRawResponse: row.ai_raw_response,
    educationDetails: row.education_details,
    employmentDetails: row.employment_details,
    recipientName: row.recipient_name,
    institution: row.institution,
    certificateNumber: row.certificate_number,
    description: row.description,
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at || null,
    isPinned: Boolean(row.is_pinned),
    pinnedAt: row.pinned_at || null,
    uploadedAt: row.uploaded_at,
    updatedAt: row.updated_at,
  };
}

export class FirestoreStorage implements IStorage {
  private users: Map<string, UserRecord & { password?: string }> = new Map();
  private documents: Map<string, DocumentRecord> = new Map();
  private shares: Map<string, ShareRecord> = new Map();
  private auditLogs: AuditLogRecord[] = [];
  private notifications: NotificationRecord[] = [];
  private storageBaseDir: string;

  constructor() {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    this.storageBaseDir = isServerless
      ? path.join(os.tmpdir(), "filevault_storage")
      : path.join(process.cwd(), "uploads", "cloud_storage");
    try {
      fs.mkdirSync(this.storageBaseDir, { recursive: true });
    } catch (err: any) {
      console.warn("[Storage] Notice initializing local storage directory:", err.message);
    }
  }

  // --- Users ---
  async getUser(id: string): Promise<UserRecord | undefined> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
        if (!error && data) {
          return {
            id: data.id,
            username: data.username,
            email: data.email,
            name: data.name,
            profileImage: data.profile_image,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err) {
        // Fallback
      }

      // Query Supabase Auth directly
      try {
        const { data: sbData, error: sbErr } = await supabase.auth.admin.getUserById(id);
        if (!sbErr && sbData?.user) {
          const u = sbData.user;
          const userRec: UserRecord = {
            id: u.id,
            username: (u.user_metadata as any)?.username || u.email?.split("@")[0] || u.id,
            email: u.email || `${(u.user_metadata as any)?.username || u.id}@filevault.local`,
            name: (u.user_metadata as any)?.name || (u.user_metadata as any)?.full_name || u.email || u.id,
            createdAt: u.created_at,
            updatedAt: u.updated_at || u.created_at,
          };
          this.users.set(u.id, userRec);
          return userRec;
        } else if (sbErr || !sbData?.user) {
          // User was removed from Supabase Auth: purge stale memory entry
          this.users.delete(id);
          return undefined;
        }
      } catch {}
    }

    const user = this.users.get(id);
    if (!user) return undefined;
    const { password, ...userRecord } = user;
    return userRecord;
  }

  async getUserByUsername(username: string): Promise<(UserRecord & { password?: string }) | undefined> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("users").select("*").ilike("username", username).maybeSingle();
        if (!error && data) {
          const localUser = Array.from(this.users.values()).find((u) => u.id === data.id);
          return {
            id: data.id,
            username: data.username,
            email: data.email || `${data.username}@filevault.local`,
            name: data.name,
            profileImage: data.profile_image,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            password: localUser?.password,
          };
        }
      } catch (err) {
        // Fallback
      }

      // Check Supabase Auth admin user list
      try {
        const normalized = username.toLowerCase();
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (!listErr && listData?.users) {
          const match = listData.users.find(
            (u) =>
              u.email?.toLowerCase() === normalized ||
              (u.user_metadata as any)?.username?.toLowerCase() === normalized
          );
          if (match) {
            const localUser = this.users.get(match.id);
            const userRec: UserRecord & { password?: string } = {
              id: match.id,
              username: (match.user_metadata as any)?.username || match.email || match.id,
              email: match.email || `${(match.user_metadata as any)?.username || match.id}@filevault.local`,
              name: (match.user_metadata as any)?.name || (match.user_metadata as any)?.full_name || match.email || match.id,
              createdAt: match.created_at,
              updatedAt: match.updated_at || match.created_at,
              password: localUser?.password,
            };
            this.users.set(match.id, userRec);
            return userRec;
          } else {
            // When Supabase is active, if user is not in Supabase Auth, purge any stale in-memory cached user
            for (const [uid, cached] of Array.from(this.users.entries())) {
              if (
                cached.username.toLowerCase() === normalized ||
                (cached.email && cached.email.toLowerCase() === normalized)
              ) {
                this.users.delete(uid);
              }
            }
            return undefined;
          }
        }
      } catch {}
    }

    for (const u of Array.from(this.users.values())) {
      if (
        u.username.toLowerCase() === username.toLowerCase() ||
        (u.email && u.email.toLowerCase() === username.toLowerCase())
      ) {
        return u;
      }
    }
    return undefined;
  }

  async ensureUserFolder(userId: string): Promise<void> {
    const folderName = await this.getUserFolder(userId);
    await this.createUserFolder(folderName);
  }

  async createUser(user: { id?: string; username: string; passwordHash: string; email?: string; name?: string }): Promise<UserRecord> {
    const id = user.id || randomUUID();
    const now = new Date().toISOString();
    const newUser: UserRecord & { password?: string } = {
      id,
      username: user.username,
      email: user.email || (user.username.includes("@") ? user.username : `${user.username}@filevault.local`),
      name: user.name || user.username,
      password: user.passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("users").upsert({
          id,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          created_at: now,
          updated_at: now,
        });
      } catch (err: any) {
        // Table sync optional if using Auth
      }
    }

    this.users.set(id, newUser);

    const { password, ...safeUser } = newUser;

    // Create named storage folder for the new user in Supabase Storage and local mirror
    const folderName = (newUser.name || newUser.username.split("@")[0] || id)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .slice(0, 32);
    try {
      await this.createUserFolder(folderName);
    } catch (folderErr: any) {
      console.warn("[Storage] Notice initializing user storage folder:", folderErr.message);
    }

    return safeUser;
  }

  // --- Documents ---
  async getDocuments(userId: string, includeDeleted = false): Promise<DocumentRecord[]> {
    let docs: DocumentRecord[] = [];
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("owner_id", userId)
          .order("uploaded_at", { ascending: false });
        if (!error && data && data.length > 0) {
          docs = data.map(mapDocFromSupabase);
        }
      } catch (err) {
        // Fallback
      }
    }

    if (docs.length === 0) {
      docs = Array.from(this.documents.values()).filter((d) => d.ownerId === userId);
    }

    if (!includeDeleted) {
      docs = docs.filter((d) => !d.isDeleted);
    }
    return docs;
  }

  async getTrashDocuments(userId: string): Promise<(DocumentRecord & { daysRemaining: number })[]> {
    const all = await this.getDocuments(userId, true);
    const trashed = all.filter((d) => Boolean(d.isDeleted));
    const now = Date.now();

    return trashed
      .map((doc) => {
        const deletedTime = doc.deletedAt ? new Date(doc.deletedAt).getTime() : now;
        const daysElapsed = Math.floor((now - deletedTime) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, 30 - daysElapsed);
        return {
          ...doc,
          daysRemaining,
        };
      })
      .sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime());
  }

  async trashDocument(id: string): Promise<DocumentRecord | undefined> {
    return await this.updateDocument(id, {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    });
  }

  async restoreDocument(id: string): Promise<DocumentRecord | undefined> {
    return await this.updateDocument(id, {
      isDeleted: false,
      deletedAt: null,
    });
  }

  async togglePinDocument(id: string): Promise<DocumentRecord | undefined> {
    const doc = await this.getDocument(id);
    if (!doc) return undefined;
    const nextPinned = !doc.isPinned;
    return await this.updateDocument(id, {
      isPinned: nextPinned,
      pinnedAt: nextPinned ? new Date().toISOString() : null,
    });
  }

  async permanentDeleteDocument(id: string): Promise<void> {
    const doc = await this.getDocument(id);
    if (!doc) return;
    try {
      await this.deleteFile(doc.storagePath);
    } catch (e) {
      // ignore
    }
    const shares = await this.getSharesForDocument(doc.id, doc.ownerId);
    for (const s of shares) {
      await this.deleteShare(s.id);
    }
    await this.deleteDocument(doc.id);
  }

  async emptyTrash(userId: string): Promise<number> {
    const trashed = await this.getTrashDocuments(userId);
    let count = 0;
    for (const doc of trashed) {
      await this.permanentDeleteDocument(doc.id);
      count++;
    }
    return count;
  }

  async getDocument(id: string): Promise<DocumentRecord | undefined> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
        if (!error && data) {
          return mapDocFromSupabase(data);
        }
      } catch (err) {
        // Fallback
      }
    }

    return this.documents.get(id);
  }

  async findDocumentBySha256(userId: string, sha256: string): Promise<DocumentRecord | undefined> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("owner_id", userId)
          .eq("sha256", sha256)
          .limit(1)
          .maybeSingle();
        if (!error && data) {
          return mapDocFromSupabase(data);
        }
      } catch (err) {
        // Fallback
      }
    }

    return Array.from(this.documents.values()).find(
      (d) => d.ownerId === userId && d.sha256 === sha256
    );
  }

  async createDocument(doc: DocumentRecord): Promise<DocumentRecord> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const row = mapDocToSupabase(doc);
        const { error } = await supabase.from("documents").insert(row);
        if (error) {
          console.warn("[Supabase DB] Error inserting document:", error.message);
        } else {
          console.log(`[Supabase DB] Document "${doc.id}" saved to Supabase`);
        }
      } catch (err: any) {
        console.warn("[Supabase DB] Failed to insert document:", err.message);
      }
    }

    this.documents.set(doc.id, doc);
    return doc;
  }

  async updateDocument(id: string, updates: Partial<DocumentRecord>): Promise<DocumentRecord | undefined> {
    const existing = await this.getDocument(id);
    if (!existing) return undefined;

    const updated: DocumentRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const row = mapDocToSupabase(updated);
        const { error } = await supabase.from("documents").update(row).eq("id", id);
        if (error) {
          console.warn("[Supabase DB] Error updating document:", error.message);
        }
      } catch (err: any) {
        console.warn("[Supabase DB] Failed to update document in Supabase:", err.message);
      }
    }

    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("documents").delete().eq("id", id);
      } catch (err: any) {
        console.warn("[Supabase DB] Error deleting document from Supabase:", err.message);
      }
    }

    this.documents.delete(id);
  }

  async replaceDocument(oldDocId: string, newDoc: DocumentRecord): Promise<DocumentRecord> {
    const oldDoc = await this.getDocument(oldDocId);
    if (oldDoc) {
      await this.deleteFile(oldDoc.storagePath);
      await this.deleteDocument(oldDoc.id);
    }
    return await this.createDocument(newDoc);
  }

  // --- Shares ---
  async createShare(share: ShareRecord): Promise<ShareRecord> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("shares").insert({
          id: share.id,
          document_id: share.documentId,
          owner_id: share.ownerId,
          document_name: share.documentName,
          document_type: share.documentType,
          expires_at: share.expiresAt,
          access_limit: share.accessLimit,
          access_count: share.accessCount,
          status: share.status,
          allowed_fields: share.allowedFields,
          permission: share.permission || "both",
          created_at: share.createdAt,
        });
      } catch (err: any) {
        console.warn("[Supabase DB] Error inserting share:", err.message);
      }
    }

    this.shares.set(share.id, share);
    return share;
  }

  async getShare(id: string): Promise<ShareRecord | undefined> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("shares").select("*").eq("id", id).maybeSingle();
        if (!error && data) {
          return {
            id: data.id,
            documentId: data.document_id,
            ownerId: data.owner_id,
            documentName: data.document_name,
            documentType: data.document_type,
            expiresAt: data.expires_at,
            accessLimit: data.access_limit,
            accessCount: data.access_count,
            status: data.status,
            allowedFields: data.allowed_fields,
            permission: data.permission || "both",
            createdAt: data.created_at,
          };
        }
      } catch (err) {
        // Fallback
      }
    }

    return this.shares.get(id);
  }

  async getSharesForDocument(documentId: string, ownerId: string): Promise<ShareRecord[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("shares")
          .select("*")
          .eq("document_id", documentId)
          .eq("owner_id", ownerId);
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            documentId: d.document_id,
            ownerId: d.owner_id,
            documentName: d.document_name,
            documentType: d.document_type,
            expiresAt: d.expires_at,
            accessLimit: d.access_limit,
            accessCount: d.access_count,
            status: d.status,
            allowedFields: d.allowed_fields,
            permission: d.permission || "both",
            createdAt: d.created_at,
          }));
        }
      } catch (err) {
        // Fallback
      }
    }

    return Array.from(this.shares.values()).filter(
      (s) => s.documentId === documentId && s.ownerId === ownerId
    );
  }

  async getUserShares(ownerId: string): Promise<ShareRecord[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("shares")
          .select("*")
          .eq("owner_id", ownerId)
          .order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            documentId: d.document_id,
            ownerId: d.owner_id,
            documentName: d.document_name,
            documentType: d.document_type,
            expiresAt: d.expires_at,
            accessLimit: d.access_limit,
            accessCount: d.access_count,
            status: d.status,
            allowedFields: d.allowed_fields,
            permission: d.permission || "both",
            createdAt: d.created_at,
          }));
        }
      } catch (err) {
        // Fallback
      }
    }

    return Array.from(this.shares.values())
      .filter((s) => s.ownerId === ownerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateShare(id: string, updates: Partial<ShareRecord>): Promise<ShareRecord | undefined> {
    const existing = await this.getShare(id);
    if (!existing) return undefined;

    const updated: ShareRecord = {
      ...existing,
      ...updates,
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("shares").update({
          status: updated.status,
          access_count: updated.accessCount,
          expires_at: updated.expiresAt,
        }).eq("id", id);
      } catch (err: any) {
        console.warn("[Supabase DB] Error updating share:", err.message);
      }
    }

    this.shares.set(id, updated);
    return updated;
  }

  async deleteShare(id: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("shares").delete().eq("id", id);
      } catch (err: any) {
        console.warn("[Supabase DB] Error deleting share:", err.message);
      }
    }

    this.shares.delete(id);
  }

  // --- Audit Logs (User explicitly requested Supabase database saving) ---
  async createAuditLog(log: Omit<AuditLogRecord, "id">): Promise<AuditLogRecord> {
    const entry: AuditLogRecord = {
      id: randomUUID(),
      ...log,
      timestamp: log.timestamp || new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { error } = await supabase.from("audit_logs").insert({
          id: entry.id,
          user_id: entry.userId,
          action: entry.action,
          document_id: entry.documentId || null,
          document_name: entry.documentName || null,
          details: entry.details || null,
          timestamp: entry.timestamp,
          status: entry.status || "SUCCESS",
        });
        if (error) {
          console.warn("[Supabase DB] Error saving audit log:", error.message);
        } else {
          console.log(`[Supabase DB] Audit log saved to Supabase: ${entry.action}`);
        }
      } catch (err: any) {
        console.warn("[Supabase DB] Failed to record audit log in Supabase:", err.message);
      }
    }

    this.auditLogs.unshift(entry);
    return entry;
  }

  async getAuditLogs(userId: string): Promise<AuditLogRecord[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("*")
          .eq("user_id", userId)
          .order("timestamp", { ascending: false })
          .limit(100);
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            userId: d.user_id,
            action: d.action,
            documentId: d.document_id,
            documentName: d.document_name,
            details: d.details,
            timestamp: d.timestamp,
            status: d.status,
          }));
        }
      } catch (err) {
        // Fallback
      }
    }

    return this.auditLogs
      .filter((l) => l.userId === userId)
      .slice(0, 100);
  }

  // --- Notifications ---
  async getNotifications(userId: string): Promise<NotificationRecord[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            userId: d.user_id,
            title: d.title,
            message: d.message,
            type: d.type,
            read: d.read,
            createdAt: d.created_at,
          }));
        }
      } catch (err) {
        // Fallback
      }
    }

    return this.notifications.filter((n) => n.userId === userId);
  }

  async createNotification(notif: Omit<NotificationRecord, "id">): Promise<NotificationRecord> {
    const id = randomUUID();
    const item: NotificationRecord = {
      id,
      ...notif,
      createdAt: notif.createdAt || new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("notifications").insert({
          id: item.id,
          user_id: item.userId,
          title: item.title,
          message: item.message,
          type: item.type,
          read: item.read,
          created_at: item.createdAt,
        });
      } catch (err: any) {
        console.warn("[Supabase DB] Error creating notification:", err.message);
      }
    }

    this.notifications.unshift(item);
    return item;
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", userId);
      } catch (err) {
        // Fallback
      }
    }

    const item = this.notifications.find((n) => n.id === id && n.userId === userId);
    if (item) {
      item.read = true;
      return true;
    }
    return false;
  }

  // --- Storage (Supabase Storage + Local Mirror) ---
  // Structure: users/{userFolder}/documents/{category}/{fileName}

  async getUserFolder(userId: string): Promise<string> {
    const user = await this.getUser(userId);
    if (!user) return userId;
    // Prefer user name, or username before '@', fallback to userId
    const raw = user.name || user.username?.split("@")[0] || userId;
    const sanitized = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
    return sanitized || userId;
  }

  async createUserFolder(folderName: string): Promise<void> {
    const cleanFolder = folderName.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
    const keepFilePath = `users/${cleanFolder}/.keep`;

    // 1. Supabase Storage: create user directory with .keep placeholder so it is visible in the console
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const bucketName = getSupabaseBucketName();
      try {
        await supabase.storage.from(bucketName).upload(keepFilePath, Buffer.from(""), {
          upsert: true,
        });
        console.log(`[Supabase Storage] Initialized user folder "${cleanFolder}" in bucket "${bucketName}"`);
      } catch (err: any) {
        console.warn(`[Supabase Storage] Notice initializing user folder "${cleanFolder}":`, err.message);
      }
    }



    // 3. Local Cloud Storage mirror
    try {
      const userLocalDir = path.join(this.storageBaseDir, "users", cleanFolder, "documents");
      fs.mkdirSync(userLocalDir, { recursive: true });
      fs.writeFileSync(path.join(this.storageBaseDir, "users", cleanFolder, ".keep"), "");
    } catch {}
  }

  async saveFile(userId: string, targetPathOrCategory: string, fileName: string, buffer: Buffer): Promise<string> {
    let logicalStoragePath: string;
    let localSubDir: string[];

    if (targetPathOrCategory.startsWith("users/")) {
      logicalStoragePath = targetPathOrCategory;
      localSubDir = targetPathOrCategory.split("/");
    } else {
      const userFolder = await this.getUserFolder(userId);
      // Ensure user folder exists
      await this.createUserFolder(userFolder);

      if (fileName === "original" || fileName.startsWith("original")) {
        logicalStoragePath = `users/${userFolder}/documents/${targetPathOrCategory}/original`;
        localSubDir = ["users", userFolder, "documents", targetPathOrCategory, "original"];
      } else {
        const sanitizedCategory = (targetPathOrCategory || "other").toLowerCase();
        logicalStoragePath = `users/${userFolder}/documents/${sanitizedCategory}/${fileName}`;
        localSubDir = ["users", userFolder, "documents", sanitizedCategory, fileName];
      }
    }

    // 1. Upload to Supabase Storage if configured
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const bucketName = getSupabaseBucketName();
      try {
        const { error } = await supabase.storage.from(bucketName).upload(logicalStoragePath, buffer, {
          upsert: true,
        });
        if (error) {
          console.warn("[Supabase Storage] Upload notice:", error.message);
        } else {
          console.log(`[Supabase Storage] Successfully stored "${logicalStoragePath}" in bucket "${bucketName}"`);
        }
      } catch (err: any) {
        console.warn("[Supabase Storage] Failed to upload to Supabase bucket:", err.message);
      }
    }



    // 3. Local Cloud Storage mirror matching path hierarchy
    try {
      const targetDir = path.join(this.storageBaseDir, ...localSubDir.slice(0, -1));
      fs.mkdirSync(targetDir, { recursive: true });
      const localFsPath = path.join(this.storageBaseDir, ...localSubDir);
      fs.writeFileSync(localFsPath, buffer);
    } catch (err: any) {
      console.warn("[Storage] Notice: local disk mirror write skipped:", err.message);
    }

    return logicalStoragePath;
  }

  async moveFile(oldStoragePath: string, newStoragePath: string): Promise<void> {
    if (!oldStoragePath || !newStoragePath || oldStoragePath === newStoragePath) return;

    // 1. Move in Supabase Storage
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const bucketName = getSupabaseBucketName();
      try {
        const { error } = await supabase.storage.from(bucketName).move(oldStoragePath, newStoragePath);
        if (error) {
          // Fallback: download old, upload new, delete old
          const { data: fileData, error: downloadError } = await supabase.storage.from(bucketName).download(oldStoragePath);
          if (!downloadError && fileData) {
            const arrayBuffer = await fileData.arrayBuffer();
            await supabase.storage.from(bucketName).upload(newStoragePath, Buffer.from(arrayBuffer), { upsert: true });
            await supabase.storage.from(bucketName).remove([oldStoragePath]);
            console.log(`[Supabase Storage] Relocated file (via fallback) "${oldStoragePath}" -> "${newStoragePath}"`);
          } else {
            console.warn("[Supabase Storage] Move notice:", error.message);
          }
        } else {
          console.log(`[Supabase Storage] Relocated file "${oldStoragePath}" -> "${newStoragePath}"`);
        }
      } catch (err: any) {
        console.warn("[Supabase Storage] Failed to move file in Supabase:", err.message);
      }
    }



    // 3. Move in Local Storage mirror
    const oldLocal = this.getFilePath(oldStoragePath);
    const newLocal = this.getFilePath(newStoragePath);
    if (fs.existsSync(oldLocal)) {
      try {
        fs.mkdirSync(path.dirname(newLocal), { recursive: true });
        fs.copyFileSync(oldLocal, newLocal);
        fs.unlinkSync(oldLocal);
        console.log(`[Local Storage] Moved "${oldLocal}" -> "${newLocal}"`);
      } catch (err: any) {
        console.warn("[Local Storage] Error relocating local file:", err.message);
      }
    }
  }

  getFilePath(storagePath: string): string {
    return path.join(this.storageBaseDir, ...storagePath.split("/"));
  }

  async deleteFile(storagePath: string): Promise<void> {
    // 1. Delete from Supabase Storage
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.storage.from(getSupabaseBucketName()).remove([storagePath]);
      } catch (err: any) {
        console.warn("[Supabase Storage] Error deleting file from Supabase:", err.message);
      }
    }



    // 3. Delete from Local Storage
    const localPath = this.getFilePath(storagePath);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (e) {
        console.error("Failed to delete file from local storage:", e);
      }
    }
  }
}

export const storage = new FirestoreStorage();