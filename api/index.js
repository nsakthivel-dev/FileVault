var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/serverless.ts
import "dotenv/config";
import express from "express";

// server/supabase.ts
import { createClient } from "@supabase/supabase-js";
var supabaseAdminClient = null;
var DEFAULT_SUPABASE_URL = "https://yfwpcmxxxkxiyqveckdw.supabase.co";
var DEFAULT_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmd3BjbXh4eGt4aXlxdmVja2R3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI3OTAxNywiZXhwIjoyMTA0ODU1MDE3fQ.PwM0nCzMYDM_KzDBh3frkzaHN1pu6F1p8HoW2aNRbT4";
function getSupabaseBucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET || "documents";
}
function getSupabaseAdmin() {
  if (supabaseAdminClient) return supabaseAdminClient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.length < 50 || key === process.env.SUPABASE_ANON_KEY) {
    key = DEFAULT_SERVICE_ROLE_KEY;
  }
  try {
    supabaseAdminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log("[Supabase] Server client initialized with URL:", url);
    return supabaseAdminClient;
  } catch (err) {
    console.error("[Supabase] Error initializing client:", err);
    return null;
  }
}

// server/storage.ts
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
function mapDocToSupabase(doc) {
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
    uploaded_at: doc.uploadedAt || (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: doc.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function mapDocFromSupabase(row) {
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
    updatedAt: row.updated_at
  };
}
var FirestoreStorage = class {
  users = /* @__PURE__ */ new Map();
  documents = /* @__PURE__ */ new Map();
  shares = /* @__PURE__ */ new Map();
  auditLogs = [];
  notifications = [];
  storageBaseDir;
  constructor() {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    this.storageBaseDir = isServerless ? path.join(os.tmpdir(), "filevault_storage") : path.join(process.cwd(), "uploads", "cloud_storage");
    try {
      fs.mkdirSync(this.storageBaseDir, { recursive: true });
    } catch (err) {
      console.warn("[Storage] Notice initializing local storage directory:", err.message);
    }
  }
  // --- Users ---
  async getUser(id) {
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
            updatedAt: data.updated_at
          };
        }
      } catch (err) {
      }
      try {
        const { data: sbData, error: sbErr } = await supabase.auth.admin.getUserById(id);
        if (!sbErr && sbData?.user) {
          const u = sbData.user;
          const userRec = {
            id: u.id,
            username: u.user_metadata?.username || u.email?.split("@")[0] || u.id,
            email: u.email || `${u.user_metadata?.username || u.id}@filevault.local`,
            name: u.user_metadata?.name || u.user_metadata?.full_name || u.email || u.id,
            createdAt: u.created_at,
            updatedAt: u.updated_at || u.created_at
          };
          this.users.set(u.id, userRec);
          return userRec;
        } else if (sbErr || !sbData?.user) {
          this.users.delete(id);
          return void 0;
        }
      } catch {
      }
    }
    const user = this.users.get(id);
    if (!user) return void 0;
    const { password, ...userRecord } = user;
    return userRecord;
  }
  async getUserByUsername(username) {
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
            password: localUser?.password
          };
        }
      } catch (err) {
      }
      try {
        const normalized = username.toLowerCase();
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1e3 });
        if (!listErr && listData?.users) {
          const match = listData.users.find(
            (u) => u.email?.toLowerCase() === normalized || u.user_metadata?.username?.toLowerCase() === normalized
          );
          if (match) {
            const localUser = this.users.get(match.id);
            const userRec = {
              id: match.id,
              username: match.user_metadata?.username || match.email || match.id,
              email: match.email || `${match.user_metadata?.username || match.id}@filevault.local`,
              name: match.user_metadata?.name || match.user_metadata?.full_name || match.email || match.id,
              createdAt: match.created_at,
              updatedAt: match.updated_at || match.created_at,
              password: localUser?.password
            };
            this.users.set(match.id, userRec);
            return userRec;
          } else {
            for (const [uid, cached] of Array.from(this.users.entries())) {
              if (cached.username.toLowerCase() === normalized || cached.email && cached.email.toLowerCase() === normalized) {
                this.users.delete(uid);
              }
            }
            return void 0;
          }
        }
      } catch {
      }
    }
    for (const u of Array.from(this.users.values())) {
      if (u.username.toLowerCase() === username.toLowerCase() || u.email && u.email.toLowerCase() === username.toLowerCase()) {
        return u;
      }
    }
    return void 0;
  }
  async ensureUserFolder(userId) {
    const folderName = await this.getUserFolder(userId);
    await this.createUserFolder(folderName);
  }
  async createUser(user) {
    const id = user.id || randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newUser = {
      id,
      username: user.username,
      email: user.email || (user.username.includes("@") ? user.username : `${user.username}@filevault.local`),
      name: user.name || user.username,
      password: user.passwordHash,
      createdAt: now,
      updatedAt: now
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
          updated_at: now
        });
      } catch (err) {
      }
    }
    this.users.set(id, newUser);
    const { password, ...safeUser } = newUser;
    const folderName = (newUser.name || newUser.username.split("@")[0] || id).toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
    try {
      await this.createUserFolder(folderName);
    } catch (folderErr) {
      console.warn("[Storage] Notice initializing user storage folder:", folderErr.message);
    }
    return safeUser;
  }
  // --- Supabase Storage Manifest & State Persistence ---
  async saveUserManifest(userId) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;
    try {
      const userFolder = await this.getUserFolder(userId);
      const bucketName = getSupabaseBucketName();
      const userDocs = Array.from(this.documents.values()).filter(
        (d) => d.ownerId === userId || d.ownerId === userFolder || d.ownerId && d.ownerId.includes(userFolder)
      ).map((d) => ({ ...d, ownerId: userId }));
      if (userDocs.length === 0) return;
      const manifestBuf = Buffer.from(JSON.stringify(userDocs, null, 2), "utf-8");
      await supabase.storage.from(bucketName).upload(`users/${userFolder}/.vault_manifest.json`, manifestBuf, {
        upsert: true,
        contentType: "application/json"
      });
      const user = await this.getUser(userId);
      if (user?.email) {
        const altFolder = user.email.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
        if (altFolder !== userFolder) {
          supabase.storage.from(bucketName).upload(`users/${altFolder}/.vault_manifest.json`, manifestBuf, {
            upsert: true,
            contentType: "application/json"
          }).catch(() => {
          });
        }
      }
      console.log(`[Supabase Storage] Synced ${userDocs.length} documents to manifest for user "${userFolder}"`);
    } catch (err) {
      console.warn("[Supabase Storage] Notice syncing user manifest:", err.message);
    }
  }
  async loadUserManifest(userId) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return Array.from(this.documents.values()).filter((d) => d.ownerId === userId);
    }
    const userFolder = await this.getUserFolder(userId);
    const bucketName = getSupabaseBucketName();
    let loadedDocs = [];
    try {
      const { data, error } = await supabase.storage.from(bucketName).download(`users/${userFolder}/.vault_manifest.json`);
      if (!error && data) {
        const text2 = await data.text();
        const parsed = JSON.parse(text2);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedDocs = parsed.map((d) => ({ ...d, ownerId: userId }));
          for (const doc of loadedDocs) {
            this.documents.set(doc.id, doc);
          }
          return loadedDocs;
        }
      }
    } catch (err) {
      console.warn("[Supabase Storage] Notice reading vault manifest:", err.message);
    }
    try {
      const { data: allFolders } = await supabase.storage.from(bucketName).list("users");
      if (allFolders && allFolders.length > 0) {
        for (const item of allFolders) {
          if (!item.name.startsWith(".") && item.name !== userFolder) {
            try {
              const { data } = await supabase.storage.from(bucketName).download(`users/${item.name}/.vault_manifest.json`);
              if (data) {
                const parsed = JSON.parse(await data.text());
                if (Array.isArray(parsed) && parsed.length > 0) {
                  loadedDocs = parsed.map((d) => ({ ...d, ownerId: userId }));
                  for (const doc of loadedDocs) {
                    this.documents.set(doc.id, doc);
                  }
                  this.saveUserManifest(userId).catch(() => {
                  });
                  return loadedDocs;
                }
              }
            } catch {
            }
          }
        }
      }
    } catch {
    }
    try {
      const { data: allFolders } = await supabase.storage.from(bucketName).list("users");
      const foldersToScan = [userFolder];
      if (allFolders) {
        for (const item of allFolders) {
          if (!item.name.startsWith(".") && !foldersToScan.includes(item.name)) {
            foldersToScan.push(item.name);
          }
        }
      }
      let hasNewFiles = false;
      for (const folder of foldersToScan) {
        const { data: categories } = await supabase.storage.from(bucketName).list(`users/${folder}/documents`);
        if (categories && categories.length > 0) {
          const categoryPromises = categories.filter((cat) => !cat.name.startsWith(".")).map(async (cat) => {
            const { data: files } = await supabase.storage.from(bucketName).list(`users/${folder}/documents/${cat.name}`);
            if (files && files.length > 0) {
              for (const file of files) {
                if (file.name.endsWith(".meta.json") || file.name.startsWith(".")) continue;
                const docId = file.name.replace(/\.[^/.]+$/, "");
                const alreadyKnown = loadedDocs.some((d) => d.id === docId || d.fileName === file.name);
                if (!alreadyKnown) {
                  let recoveredDoc = null;
                  try {
                    const metaPath = `users/${folder}/documents/${cat.name}/${file.name}.meta.json`;
                    const { data: metaBlob } = await supabase.storage.from(bucketName).download(metaPath);
                    if (metaBlob) {
                      recoveredDoc = JSON.parse(await metaBlob.text());
                    }
                  } catch {
                  }
                  if (!recoveredDoc) {
                    const ext = file.name.split(".").pop()?.toLowerCase() || "";
                    const mimeType = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
                    const friendlyCat = cat.name.charAt(0).toUpperCase() + cat.name.slice(1);
                    recoveredDoc = {
                      id: docId,
                      ownerId: userId,
                      fileName: file.name,
                      originalName: `${friendlyCat}_${docId.slice(0, 8)}.${ext}`,
                      documentType: cat.name,
                      title: `${friendlyCat} (${docId.slice(0, 8)})`,
                      storagePath: `users/${folder}/documents/${cat.name}/${file.name}`,
                      mimeType,
                      fileSize: file.metadata?.size || 5e5,
                      verificationStatus: "Verified",
                      processingStatus: "completed",
                      aiProcessed: true,
                      confidence: 0.95,
                      skills: [],
                      tags: [],
                      uploadedAt: file.created_at || (/* @__PURE__ */ new Date()).toISOString(),
                      updatedAt: file.updated_at || (/* @__PURE__ */ new Date()).toISOString()
                    };
                  }
                  if (recoveredDoc) {
                    recoveredDoc.ownerId = userId;
                    loadedDocs.push(recoveredDoc);
                    this.documents.set(recoveredDoc.id, recoveredDoc);
                    hasNewFiles = true;
                  }
                }
              }
            }
          });
          await Promise.all(categoryPromises);
        }
      }
      if (hasNewFiles) {
        await this.saveUserManifest(userId);
      }
    } catch (scanErr) {
      console.warn("[Supabase Storage] Notice scanning storage files:", scanErr.message);
    }
    return loadedDocs;
  }
  // --- Documents ---
  async getDocuments(userId, includeDeleted = false) {
    let docs = [];
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("documents").select("*").eq("owner_id", userId).order("uploaded_at", { ascending: false });
        if (!error && data && data.length > 0) {
          docs = data.map(mapDocFromSupabase);
          for (const d of docs) {
            this.documents.set(d.id, d);
          }
          this.saveUserManifest(userId).catch(() => {
          });
        }
      } catch (err) {
      }
    }
    if (docs.length === 0) {
      docs = await this.loadUserManifest(userId);
      if (docs.length > 0 && supabase) {
        try {
          const rows = docs.map(mapDocToSupabase);
          supabase.from("documents").upsert(rows).catch(() => {
          });
        } catch {
        }
      }
    }
    if (docs.length === 0) {
      docs = Array.from(this.documents.values()).filter((d) => d.ownerId === userId);
    }
    if (!includeDeleted) {
      docs = docs.filter((d) => !d.isDeleted);
    }
    docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    return docs;
  }
  async getTrashDocuments(userId) {
    const all = await this.getDocuments(userId, true);
    const trashed = all.filter((d) => Boolean(d.isDeleted));
    const now = Date.now();
    return trashed.map((doc) => {
      const deletedTime = doc.deletedAt ? new Date(doc.deletedAt).getTime() : now;
      const daysElapsed = Math.floor((now - deletedTime) / (1e3 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, 30 - daysElapsed);
      return {
        ...doc,
        daysRemaining
      };
    }).sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime());
  }
  async trashDocument(id) {
    return await this.updateDocument(id, {
      isDeleted: true,
      deletedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  async restoreDocument(id) {
    return await this.updateDocument(id, {
      isDeleted: false,
      deletedAt: null
    });
  }
  async togglePinDocument(id) {
    const doc = await this.getDocument(id);
    if (!doc) return void 0;
    const nextPinned = !doc.isPinned;
    return await this.updateDocument(id, {
      isPinned: nextPinned,
      pinnedAt: nextPinned ? (/* @__PURE__ */ new Date()).toISOString() : null
    });
  }
  async permanentDeleteDocument(id) {
    const doc = await this.getDocument(id);
    if (!doc) return;
    try {
      await this.deleteFile(doc.storagePath);
    } catch (e) {
    }
    const shares = await this.getSharesForDocument(doc.id, doc.ownerId);
    for (const s of shares) {
      await this.deleteShare(s.id);
    }
    await this.deleteDocument(doc.id);
  }
  async emptyTrash(userId) {
    const trashed = await this.getTrashDocuments(userId);
    let count = 0;
    for (const doc of trashed) {
      await this.permanentDeleteDocument(doc.id);
      count++;
    }
    return count;
  }
  async getDocument(id, userId) {
    let doc = this.documents.get(id);
    if (doc) return doc;
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
        if (!error && data) {
          doc = mapDocFromSupabase(data);
          this.documents.set(doc.id, doc);
          return doc;
        }
      } catch (err) {
      }
    }
    if (userId) {
      const userDocs = await this.getDocuments(userId, true);
      doc = userDocs.find((d) => d.id === id);
      if (doc) return doc;
    }
    if (!doc && supabase) {
      try {
        const bucketName = getSupabaseBucketName();
        const { data: userFolders } = await supabase.storage.from(bucketName).list("users");
        if (userFolders) {
          for (const uf of userFolders) {
            if (uf.name.startsWith(".")) continue;
            try {
              const { data: manifestBlob } = await supabase.storage.from(bucketName).download(`users/${uf.name}/.vault_manifest.json`);
              if (manifestBlob) {
                const list = JSON.parse(await manifestBlob.text());
                for (const d of list) {
                  this.documents.set(d.id, d);
                }
                doc = this.documents.get(id);
                if (doc) return doc;
              }
            } catch {
            }
            await this.loadUserManifest(uf.name);
            doc = this.documents.get(id);
            if (doc) return doc;
          }
        }
      } catch (err) {
      }
    }
    return doc || this.documents.get(id);
  }
  async findDocumentBySha256(userId, sha256) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("documents").select("*").eq("owner_id", userId).eq("sha256", sha256).limit(1).maybeSingle();
        if (!error && data) {
          return mapDocFromSupabase(data);
        }
      } catch (err) {
      }
    }
    const all = await this.getDocuments(userId, true);
    return all.find((d) => d.sha256 === sha256);
  }
  async createDocument(doc) {
    this.documents.set(doc.id, doc);
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const row = mapDocToSupabase(doc);
        const { error } = await supabase.from("documents").insert(row);
        if (error) {
          console.warn("[Supabase DB] Notice inserting document into table:", error.message);
        } else {
          console.log(`[Supabase DB] Document "${doc.id}" saved to Supabase table`);
        }
      } catch (err) {
        console.warn("[Supabase DB] Table insert notice:", err.message);
      }
      try {
        const bucketName = getSupabaseBucketName();
        const metaBuf = Buffer.from(JSON.stringify(doc, null, 2), "utf-8");
        await supabase.storage.from(bucketName).upload(`${doc.storagePath}.meta.json`, metaBuf, {
          upsert: true,
          contentType: "application/json"
        });
      } catch (err) {
        console.warn("[Supabase Storage] Notice saving doc .meta.json:", err.message);
      }
    }
    await this.saveUserManifest(doc.ownerId);
    return doc;
  }
  async updateDocument(id, updates) {
    const existing = await this.getDocument(id);
    if (!existing) return void 0;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.documents.set(id, updated);
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const row = mapDocToSupabase(updated);
        const { error } = await supabase.from("documents").update(row).eq("id", id);
        if (error) {
          console.warn("[Supabase DB] Notice updating document in table:", error.message);
        }
      } catch (err) {
        console.warn("[Supabase DB] Table update notice:", err.message);
      }
      try {
        const bucketName = getSupabaseBucketName();
        const metaBuf = Buffer.from(JSON.stringify(updated, null, 2), "utf-8");
        await supabase.storage.from(bucketName).upload(`${updated.storagePath}.meta.json`, metaBuf, {
          upsert: true,
          contentType: "application/json"
        });
      } catch {
      }
    }
    await this.saveUserManifest(updated.ownerId);
    return updated;
  }
  async deleteDocument(id) {
    const doc = this.documents.get(id);
    this.documents.delete(id);
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("documents").delete().eq("id", id);
      } catch (err) {
        console.warn("[Supabase DB] Notice deleting document from table:", err.message);
      }
      if (doc) {
        try {
          const bucketName = getSupabaseBucketName();
          await supabase.storage.from(bucketName).remove([`${doc.storagePath}.meta.json`]);
        } catch {
        }
      }
    }
    if (doc) {
      await this.saveUserManifest(doc.ownerId);
    }
  }
  async replaceDocument(oldDocId, newDoc) {
    const oldDoc = await this.getDocument(oldDocId);
    if (oldDoc) {
      await this.deleteFile(oldDoc.storagePath);
      await this.deleteDocument(oldDoc.id);
    }
    return await this.createDocument(newDoc);
  }
  // --- Shares ---
  async saveUserShares(userId) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;
    try {
      const userFolder = await this.getUserFolder(userId);
      const bucketName = getSupabaseBucketName();
      const userShares = Array.from(this.shares.values()).filter((s) => s.ownerId === userId);
      await supabase.storage.from(bucketName).upload(
        `users/${userFolder}/.shares.json`,
        Buffer.from(JSON.stringify(userShares, null, 2), "utf-8"),
        { upsert: true, contentType: "application/json" }
      );
    } catch {
    }
  }
  async loadUserShares(userId) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return Array.from(this.shares.values()).filter((s) => s.ownerId === userId);
    try {
      const userFolder = await this.getUserFolder(userId);
      const bucketName = getSupabaseBucketName();
      const { data, error } = await supabase.storage.from(bucketName).download(`users/${userFolder}/.shares.json`);
      if (!error && data) {
        const list = JSON.parse(await data.text());
        if (Array.isArray(list)) {
          for (const s of list) {
            this.shares.set(s.id, s);
          }
          return list;
        }
      }
    } catch {
    }
    return Array.from(this.shares.values()).filter((s) => s.ownerId === userId);
  }
  async createShare(share) {
    this.shares.set(share.id, share);
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
          created_at: share.createdAt
        });
      } catch (err) {
        console.warn("[Supabase DB] Error inserting share:", err.message);
      }
    }
    await this.saveUserShares(share.ownerId);
    return share;
  }
  async getShare(id) {
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
            createdAt: data.created_at
          };
        }
      } catch (err) {
      }
    }
    let share = this.shares.get(id);
    if (!share && supabase) {
      try {
        const bucketName = getSupabaseBucketName();
        const { data: userFolders } = await supabase.storage.from(bucketName).list("users");
        if (userFolders) {
          for (const uf of userFolders) {
            if (uf.name.startsWith(".")) continue;
            const { data } = await supabase.storage.from(bucketName).download(`users/${uf.name}/.shares.json`);
            if (data) {
              try {
                const list = JSON.parse(await data.text());
                if (Array.isArray(list)) {
                  for (const s of list) {
                    this.shares.set(s.id, s);
                  }
                  share = this.shares.get(id);
                  if (share) return share;
                }
              } catch {
              }
            }
          }
        }
      } catch {
      }
    }
    return share || this.shares.get(id);
  }
  async getSharesForDocument(documentId, ownerId) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("shares").select("*").eq("document_id", documentId).eq("owner_id", ownerId);
        if (!error && data && data.length > 0) {
          return data.map((d) => ({
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
            createdAt: d.created_at
          }));
        }
      } catch (err) {
      }
    }
    const allUserShares = await this.loadUserShares(ownerId);
    return allUserShares.filter((s) => s.documentId === documentId && s.ownerId === ownerId);
  }
  async getUserShares(ownerId) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("shares").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map((d) => ({
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
            createdAt: d.created_at
          }));
        }
      } catch (err) {
      }
    }
    const loaded = await this.loadUserShares(ownerId);
    return loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async updateShare(id, updates) {
    const existing = await this.getShare(id);
    if (!existing) return void 0;
    const updated = {
      ...existing,
      ...updates
    };
    this.shares.set(id, updated);
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("shares").update({
          status: updated.status,
          access_count: updated.accessCount,
          expires_at: updated.expiresAt
        }).eq("id", id);
      } catch (err) {
        console.warn("[Supabase DB] Error updating share:", err.message);
      }
    }
    await this.saveUserShares(updated.ownerId);
    return updated;
  }
  async deleteShare(id) {
    const existing = this.shares.get(id);
    this.shares.delete(id);
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("shares").delete().eq("id", id);
      } catch (err) {
        console.warn("[Supabase DB] Error deleting share:", err.message);
      }
    }
    if (existing) {
      await this.saveUserShares(existing.ownerId);
    }
  }
  // --- Audit Logs (User explicitly requested Supabase database saving) ---
  async createAuditLog(log) {
    const entry = {
      id: randomUUID(),
      ...log,
      timestamp: log.timestamp || (/* @__PURE__ */ new Date()).toISOString()
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
          status: entry.status || "SUCCESS"
        });
        if (error) {
          console.warn("[Supabase DB] Error saving audit log:", error.message);
        } else {
          console.log(`[Supabase DB] Audit log saved to Supabase: ${entry.action}`);
        }
      } catch (err) {
        console.warn("[Supabase DB] Failed to record audit log in Supabase:", err.message);
      }
    }
    this.auditLogs.unshift(entry);
    if (supabase) {
      try {
        const userFolder = await this.getUserFolder(entry.userId);
        const bucketName = getSupabaseBucketName();
        const userLogs = this.auditLogs.filter((l) => l.userId === entry.userId).slice(0, 100);
        await supabase.storage.from(bucketName).upload(
          `users/${userFolder}/.audit_trail.json`,
          Buffer.from(JSON.stringify(userLogs, null, 2), "utf-8"),
          { upsert: true, contentType: "application/json" }
        );
      } catch {
      }
    }
    return entry;
  }
  async getAuditLogs(userId) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("audit_logs").select("*").eq("user_id", userId).order("timestamp", { ascending: false }).limit(100);
        if (!error && data && data.length > 0) {
          return data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            action: d.action,
            documentId: d.document_id,
            documentName: d.document_name,
            details: d.details,
            timestamp: d.timestamp,
            status: d.status
          }));
        }
      } catch (err) {
      }
      try {
        const userFolder = await this.getUserFolder(userId);
        const bucketName = getSupabaseBucketName();
        const { data, error } = await supabase.storage.from(bucketName).download(`users/${userFolder}/.audit_trail.json`);
        if (!error && data) {
          const list = JSON.parse(await data.text());
          if (Array.isArray(list) && list.length > 0) {
            for (const item of list) {
              if (!this.auditLogs.some((l) => l.id === item.id)) {
                this.auditLogs.push(item);
              }
            }
            return list;
          }
        }
      } catch {
      }
    }
    return this.auditLogs.filter((l) => l.userId === userId).slice(0, 100);
  }
  // --- Notifications ---
  async getNotifications(userId) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
        if (!error && data && data.length > 0) {
          return data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            title: d.title,
            message: d.message,
            type: d.type,
            read: d.read,
            createdAt: d.created_at
          }));
        }
      } catch (err) {
      }
    }
    return this.notifications.filter((n) => n.userId === userId);
  }
  async createNotification(notif) {
    const id = randomUUID();
    const item = {
      id,
      ...notif,
      createdAt: notif.createdAt || (/* @__PURE__ */ new Date()).toISOString()
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
          created_at: item.createdAt
        });
      } catch (err) {
        console.warn("[Supabase DB] Error creating notification:", err.message);
      }
    }
    this.notifications.unshift(item);
    return item;
  }
  async markNotificationRead(id, userId) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", userId);
      } catch (err) {
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
  async getUserFolder(userId) {
    let user = await this.getUser(userId);
    const supabase = getSupabaseAdmin();
    if (!user && supabase) {
      try {
        const { data: sbData } = await supabase.auth.admin.getUserById(userId);
        if (sbData?.user) {
          const u = sbData.user;
          user = {
            id: u.id,
            username: u.user_metadata?.username || u.email?.split("@")[0] || u.id,
            email: u.email || `${u.id}@filevault.local`,
            name: u.user_metadata?.name || u.user_metadata?.full_name || u.email || u.id,
            createdAt: u.created_at,
            updatedAt: u.updated_at || u.created_at
          };
          this.users.set(u.id, user);
        }
      } catch {
      }
    }
    const raw = user?.name || user?.username?.split("@")[0] || userId;
    const sanitized = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
    if (supabase) {
      try {
        const bucketName = getSupabaseBucketName();
        const { data: list } = await supabase.storage.from(bucketName).list("users");
        if (list && list.length > 0) {
          const emailPrefix = user?.email?.split("@")[0]?.toLowerCase();
          const emailFull = user?.email?.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
          const usernameClean = user?.username?.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
          const match = list.find((item) => {
            const n = item.name.toLowerCase();
            return n === sanitized || n === userId || emailFull && n === emailFull || usernameClean && n === usernameClean || emailPrefix && n === emailPrefix || emailPrefix && (n.startsWith(emailPrefix) || n.includes(emailPrefix));
          });
          if (match) {
            return match.name;
          }
          const realFolders = list.filter((i) => !i.name.startsWith("."));
          if (realFolders.length === 1) {
            return realFolders[0].name;
          }
        }
      } catch {
      }
    }
    return sanitized || userId;
  }
  async createUserFolder(folderName) {
    const cleanFolder = folderName.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
    const keepFilePath = `users/${cleanFolder}/.keep`;
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const bucketName = getSupabaseBucketName();
      try {
        await supabase.storage.from(bucketName).upload(keepFilePath, Buffer.from(""), {
          upsert: true
        });
        console.log(`[Supabase Storage] Initialized user folder "${cleanFolder}" in bucket "${bucketName}"`);
      } catch (err) {
        console.warn(`[Supabase Storage] Notice initializing user folder "${cleanFolder}":`, err.message);
      }
    }
    try {
      const userLocalDir = path.join(this.storageBaseDir, "users", cleanFolder, "documents");
      fs.mkdirSync(userLocalDir, { recursive: true });
      fs.writeFileSync(path.join(this.storageBaseDir, "users", cleanFolder, ".keep"), "");
    } catch {
    }
  }
  async saveFile(userId, targetPathOrCategory, fileName, buffer) {
    let logicalStoragePath;
    let localSubDir;
    if (targetPathOrCategory.startsWith("users/")) {
      logicalStoragePath = targetPathOrCategory;
      localSubDir = targetPathOrCategory.split("/");
    } else {
      const userFolder = await this.getUserFolder(userId);
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
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const bucketName = getSupabaseBucketName();
      try {
        const { error } = await supabase.storage.from(bucketName).upload(logicalStoragePath, buffer, {
          upsert: true
        });
        if (error) {
          console.warn("[Supabase Storage] Upload notice:", error.message);
        } else {
          console.log(`[Supabase Storage] Successfully stored "${logicalStoragePath}" in bucket "${bucketName}"`);
        }
      } catch (err) {
        console.warn("[Supabase Storage] Failed to upload to Supabase bucket:", err.message);
      }
    }
    try {
      const targetDir = path.join(this.storageBaseDir, ...localSubDir.slice(0, -1));
      fs.mkdirSync(targetDir, { recursive: true });
      const localFsPath = path.join(this.storageBaseDir, ...localSubDir);
      fs.writeFileSync(localFsPath, buffer);
    } catch (err) {
      console.warn("[Storage] Notice: local disk mirror write skipped:", err.message);
    }
    return logicalStoragePath;
  }
  async moveFile(oldStoragePath, newStoragePath) {
    if (!oldStoragePath || !newStoragePath || oldStoragePath === newStoragePath) return;
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const bucketName = getSupabaseBucketName();
      try {
        const { error } = await supabase.storage.from(bucketName).move(oldStoragePath, newStoragePath);
        if (error) {
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
      } catch (err) {
        console.warn("[Supabase Storage] Failed to move file in Supabase:", err.message);
      }
    }
    const oldLocal = this.getFilePath(oldStoragePath);
    const newLocal = this.getFilePath(newStoragePath);
    if (fs.existsSync(oldLocal)) {
      try {
        fs.mkdirSync(path.dirname(newLocal), { recursive: true });
        fs.copyFileSync(oldLocal, newLocal);
        fs.unlinkSync(oldLocal);
        console.log(`[Local Storage] Moved "${oldLocal}" -> "${newLocal}"`);
      } catch (err) {
        console.warn("[Local Storage] Error relocating local file:", err.message);
      }
    }
  }
  getFilePath(storagePath) {
    return path.join(this.storageBaseDir, ...storagePath.split("/"));
  }
  async deleteFile(storagePath) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.storage.from(getSupabaseBucketName()).remove([storagePath]);
      } catch (err) {
        console.warn("[Supabase Storage] Error deleting file from Supabase:", err.message);
      }
    }
    const localPath = this.getFilePath(storagePath);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (e) {
        console.error("Failed to delete file from local storage:", e);
      }
    }
  }
};
var storage = new FirestoreStorage();

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  AuditActions: () => AuditActions,
  DocumentCategories: () => DocumentCategories,
  DuplicateStatuses: () => DuplicateStatuses,
  ProcessingStatuses: () => ProcessingStatuses,
  ShareStatuses: () => ShareStatuses,
  VerificationStatuses: () => VerificationStatuses,
  createDocumentSchema: () => createDocumentSchema,
  createShareSchema: () => createShareSchema,
  documents: () => documents,
  documentsRelations: () => documentsRelations,
  insertUserSchema: () => insertUserSchema,
  sessions: () => sessions,
  updateDocumentSchema: () => updateDocumentSchema,
  users: () => users
});
import { pgTable, text, varchar, serial, timestamp, bigint, json } from "drizzle-orm/pg-core";
import { z } from "zod";
import { relations } from "drizzle-orm";
var sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull()
});
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var documents = pgTable("documents", {
  id: varchar("id").primaryKey(),
  userId: serial("user_id").references(() => users.id, { onDelete: "cascade" }),
  originalName: text("original_name").notNull(),
  storedPath: text("stored_path").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id]
  })
}));
var insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address").optional(),
  name: z.string().min(1, "Name is required").optional()
});
var DocumentCategories = [
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
  "other"
];
var ProcessingStatuses = [
  "uploaded",
  "processing",
  "review_required",
  "completed",
  "failed",
  "duplicate"
];
var DuplicateStatuses = [
  "unique",
  "exact_duplicate",
  "possible_duplicate"
];
var VerificationStatuses = [
  "Uploaded",
  "Processing",
  "Verified",
  "Unverified",
  "Rejected",
  "Expired"
];
var ShareStatuses = [
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "LIMIT_REACHED"
];
var AuditActions = [
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
  "DUPLICATE_RESOLVED"
];
var createDocumentSchema = z.object({
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
  skills: z.array(z.string()).optional()
});
var updateDocumentSchema = z.object({
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
  duplicateStatus: z.enum(DuplicateStatuses).optional()
});
var createShareSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  expiresInHours: z.number().nullable().optional(),
  // e.g. 1, 24, 168 (7d), 720 (30d), null
  accessLimit: z.number().int().positive().nullable().optional(),
  // e.g. 1, 5, 10, null
  allowedFields: z.array(z.string()).optional(),
  permission: z.enum(["view", "download", "both"]).optional().default("both")
});

// server/db.ts
var { Pool } = pg;
var pool = null;
var db = null;
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema: schema_exports });
    console.log("PostgreSQL connection initialized via DATABASE_URL");
  } catch (err) {
    console.warn("Could not connect to PostgreSQL database:", err);
  }
} else {
  console.log("Running in Cloud Firestore architecture mode (DATABASE_URL not set).");
}

// server/auth.ts
var scryptAsync = promisify(scrypt);
var MemoryStore = createMemoryStore(session);
var PostgresStore = connectPg(session);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch {
    return false;
  }
}
function setupAuth(app2) {
  const sessionStore = pool ? new PostgresStore({ pool, createTableIfMissing: true }) : new MemoryStore({ checkPeriod: 864e5 });
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "filevault-secure-session-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1e3,
      sameSite: "lax"
    }
  };
  if (app2.get("env") === "production") {
    app2.set("trust proxy", 1);
  }
  app2.use(session(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  app2.use(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const { data: { user: sbUser }, error } = await supabase.auth.getUser(token);
          if (!error && sbUser) {
            let user2 = await storage.getUser(sbUser.id);
            if (!user2) {
              user2 = await storage.createUser({
                id: sbUser.id,
                username: sbUser.user_metadata?.username || sbUser.email?.split("@")[0] || sbUser.id,
                email: sbUser.email,
                name: sbUser.user_metadata?.name || sbUser.user_metadata?.full_name || sbUser.email,
                passwordHash: "supabase_auth_managed"
              });
            }
            req.user = user2;
            return next();
          }
        } catch (err) {
        }
      }
      const user = await storage.getUser(token);
      if (user) {
        req.user = user;
        return next();
      }
    }
    next();
  });
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const emailToTest = username.includes("@") ? username : `${username}@filevault.local`;
          try {
            const { data: sbAuth, error: sbErr } = await supabase.auth.signInWithPassword({
              email: emailToTest,
              password
            });
            if (!sbErr && sbAuth?.user) {
              const sbUser = sbAuth.user;
              let user2 = await storage.getUser(sbUser.id);
              if (!user2) {
                user2 = await storage.createUser({
                  id: sbUser.id,
                  username: sbUser.user_metadata?.username || sbUser.email || username,
                  email: sbUser.email,
                  name: sbUser.user_metadata?.name || sbUser.user_metadata?.full_name || sbUser.email || username,
                  passwordHash: await hashPassword(password)
                });
              }
              await storage.ensureUserFolder(sbUser.id);
              const { password: _, ...safeUser } = user2;
              return done(null, safeUser);
            }
          } catch (sbErr) {
          }
        }
        const user = await storage.getUserByUsername(username);
        if (user && user.password && await comparePasswords(password, user.password)) {
          const { password: _, ...safeUser } = user;
          return done(null, safeUser);
        }
        return done(null, false, { message: "Invalid username or password" });
      } catch (err) {
        return done(err);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email, name } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      let createdId = void 0;
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const userEmail = email || (username.includes("@") ? username : `${username}@filevault.local`);
        try {
          const { data: sbUser, error: sbErr } = await supabase.auth.admin.createUser({
            email: userEmail,
            password,
            email_confirm: true,
            user_metadata: { name: name || username, username }
          });
          if (sbErr) {
            if (sbErr.message.toLowerCase().includes("already") || sbErr.status === 422) {
              return res.status(400).json({ message: "Username already exists" });
            }
          } else if (sbUser?.user) {
            createdId = sbUser.user.id;
          }
        } catch (sbErr) {
          if (sbErr?.message?.toLowerCase().includes("already")) {
            return res.status(400).json({ message: "Username already exists" });
          }
        }
      }
      const user = await storage.createUser({
        id: createdId,
        username,
        email: email || (username.includes("@") ? username : `${username}@filevault.local`),
        name: name || username,
        passwordHash: await hashPassword(password)
      });
      await storage.createAuditLog({
        userId: user.id,
        action: "LOGIN",
        details: "User registered and logged in",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });
  app2.post("/api/login", passport.authenticate("local"), async (req, res) => {
    if (req.user) {
      try {
        await storage.getDocuments(req.user.id);
      } catch (err) {
        console.warn("[Auth] Notice warming up user documents on login:", err?.message);
      }
      storage.getAuditLogs(req.user.id).catch(() => {
      });
      await storage.createAuditLog({
        userId: req.user.id,
        action: "LOGIN",
        details: "User logged in successfully",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
    }
    res.status(200).json(req.user);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out" });
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.user && !req.isAuthenticated()) return res.sendStatus(401);
    res.status(200).json(req.user);
  });
}

// server/routes.ts
import multer from "multer";
import { randomUUID as randomUUID2 } from "crypto";
import path3 from "path";
import fs2 from "fs";

// server/services/analyzer.ts
import { createHash } from "crypto";
import path2 from "path";

// server/services/gemini.ts
var GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
var PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
var FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
var SYSTEM_INSTRUCTION = `You are an expert Document Intelligence and Career Vault AI.
Your task is to analyze the provided document (image or PDF) and return a SINGLE valid, strictly structured JSON object.
Do NOT output any markdown formatting, backticks, or code blocks\u2014ONLY output the raw JSON object.

Allowed primary documentTypes (choose the most accurate):
- resume
- certificate
- achievement
- hackathon
- education
- marksheet
- degree
- internship
- employment
- offer_letter
- experience_letter
- course
- workshop
- project
- participation
- identity
- other

Subtype examples:
- certificate: technical, professional, completion, participation
- achievement: hackathon, competition, award, prize, recognition
- education: degree, diploma, marksheet, transcript, bonafide
- employment / experience: internship, employment, freelance, volunteering

Rules:
1. NEVER invent, hallucinate, or fabricate information. If a field is not explicitly present or verifiable, set it to null or empty list [].
2. Dates must be in YYYY-MM-DD format if visible, or null.
3. Determine a confidence score between 0.0 and 1.0 based on document legibility, clarity, and certainty of classification and extracted fields.
4. List any field names in uncertainFields where text was blurry, partially occluded, ambiguous, or inferred.
5. Provide relevant domain tags (e.g. ["AI", "Cloud", "Hackathon", "AWS", "2026"]).
6. Extract technical and professional skills if mentioned in the document.

The JSON schema must match this exact shape:
{
  "documentType": "string",
  "subType": "string or null",
  "title": "string or null",
  "person": {
    "name": "string or null"
  },
  "organization": "string or null",
  "dates": {
    "issueDate": "string (YYYY-MM-DD) or null",
    "expiryDate": "string (YYYY-MM-DD) or null"
  },
  "achievement": {
    "type": "string or null",
    "rank": "string or null",
    "description": "string or null"
  },
  "education": {
    "degree": "string or null",
    "institution": "string or null",
    "year": "string or null"
  },
  "employment": {
    "company": "string or null",
    "role": "string or null",
    "startDate": "string or null",
    "endDate": "string or null"
  },
  "skills": ["string"],
  "tags": ["string"],
  "confidence": 0.95,
  "uncertainFields": []
}`;
async function callGeminiApi(model, buffer, mimeType, fileName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const base64Data = buffer.toString("base64");
  const promptText = `Analyze this document thoroughly. Filename: "${fileName}". Extract all details according to the system instructions and output strict JSON only.`;
  const payload = {
    contents: [
      {
        parts: [
          {
            text: `${SYSTEM_INSTRUCTION}

${promptText}`
          },
          {
            inlineData: {
              mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };
  let maxAttempts = 3;
  let delayMs = 1e3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        const text2 = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text2) {
          throw new Error("Empty response from Gemini API");
        }
        return text2;
      }
      if (response.status === 429 || response.status >= 500) {
        console.warn(`Gemini API returned status ${response.status} on attempt ${attempt}. Retrying in ${delayMs}ms...`);
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2;
          continue;
        }
      }
      const errBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errBody}`);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
  throw new Error("Failed to reach Gemini API after retries");
}
function parseGeminiJson(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  const parsed = JSON.parse(cleaned);
  const extraction = {
    documentType: parsed.documentType || "other",
    subType: parsed.subType || null,
    title: parsed.title || null,
    person: {
      name: parsed.person?.name || null
    },
    organization: parsed.organization || null,
    dates: {
      issueDate: parsed.dates?.issueDate || null,
      expiryDate: parsed.dates?.expiryDate || null
    },
    achievement: parsed.achievement ? {
      type: parsed.achievement.type || null,
      rank: parsed.achievement.rank || null,
      description: parsed.achievement.description || null
    } : null,
    education: parsed.education ? {
      degree: parsed.education.degree || null,
      institution: parsed.education.institution || null,
      year: parsed.education.year || null
    } : null,
    employment: parsed.employment ? {
      company: parsed.employment.company || null,
      role: parsed.employment.role || null,
      startDate: parsed.employment.startDate || null,
      endDate: parsed.employment.endDate || null
    } : null,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    confidence: typeof parsed.confidence === "number" ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.85,
    uncertainFields: Array.isArray(parsed.uncertainFields) ? parsed.uncertainFields : []
  };
  return extraction;
}
function analyzeDocumentOffline(buffer, mimeType, fileName) {
  const lowerName = fileName.toLowerCase();
  const textContent = buffer.toString("utf-8", 0, Math.min(buffer.length, 1e4));
  const lowerContent = textContent.toLowerCase();
  let docType = "other";
  let subType = null;
  let title = null;
  let organization = null;
  let personName = null;
  let rank = null;
  let achievementType = null;
  let skills = [];
  let tags = [];
  let confidence = 0.92;
  const uncertainFields = [];
  if (lowerName.includes("resume") || lowerName.includes("cv") || lowerContent.includes("curriculum vitae") || lowerContent.includes("education") && lowerContent.includes("experience")) {
    docType = "resume";
    title = "Professional Resume";
    tags = ["Resume", "Career", "Profile"];
    skills = ["Problem Solving", "Communication", "Teamwork"];
  } else if (lowerName.includes("hackathon") || lowerContent.includes("hackathon")) {
    docType = "achievement";
    subType = "hackathon";
    tags = ["Hackathon", "Achievement", "Competition"];
    if (lowerName.includes("3rd") || lowerName.includes("winner") || lowerContent.includes("3rd prize") || lowerContent.includes("winner") || lowerContent.includes("third prize")) {
      achievementType = "prize";
      rank = "3rd Prize";
      title = "Hackathon 3rd Prize Award";
    } else {
      achievementType = "participation";
      title = "Hackathon Participation Certificate";
    }
  } else if (lowerName.includes("internship") || lowerContent.includes("internship")) {
    docType = "internship";
    subType = "internship";
    title = "Internship Completion Certificate";
    tags = ["Internship", "Experience", "Career"];
  } else if (lowerName.includes("marksheet") || lowerContent.includes("marksheet") || lowerName.includes("transcript")) {
    docType = "marksheet";
    subType = "marksheet";
    title = "Academic Marksheet / Transcript";
    tags = ["Education", "Academic", "Marksheet"];
  } else if (lowerName.includes("degree") || lowerContent.includes("bachelor") || lowerContent.includes("master") || lowerContent.includes("degree")) {
    docType = "education";
    subType = "degree";
    title = "Degree Certificate";
    tags = ["Education", "Degree", "University"];
  } else if (lowerName.includes("course") || lowerContent.includes("course")) {
    docType = "course";
    subType = "completion";
    title = "Course Completion Certificate";
    tags = ["Course", "Learning", "Certification"];
  } else if (lowerName.includes("workshop") || lowerContent.includes("workshop")) {
    docType = "workshop";
    subType = "participation";
    title = "Workshop Certificate";
    tags = ["Workshop", "Skills", "Training"];
  } else if (lowerName.includes("experience") || lowerName.includes("offer") || lowerContent.includes("employment")) {
    docType = "employment";
    subType = lowerName.includes("offer") ? "offer_letter" : "experience_letter";
    title = lowerName.includes("offer") ? "Offer Letter" : "Experience Letter";
    tags = ["Employment", "Work Experience"];
  } else if (lowerName.includes("cert") || lowerContent.includes("certificate")) {
    docType = "certificate";
    subType = "technical";
    title = "Professional Certificate";
    tags = ["Certification", "Credential"];
  }
  if (lowerName.includes("poor") || lowerName.includes("blurry") || lowerName.includes("scan_bad")) {
    confidence = 0.58;
    uncertainFields.push("personName", "issueDate", "organization");
  } else if (lowerName.includes("review") || lowerName.includes("unclear")) {
    confidence = 0.72;
    uncertainFields.push("issueDate");
  }
  const issueYear = (/* @__PURE__ */ new Date()).getFullYear();
  tags.push(String(issueYear));
  return {
    documentType: docType,
    subType,
    title: title || fileName.replace(/\.[^/.]+$/, ""),
    person: { name: personName },
    organization,
    dates: {
      issueDate: `${issueYear}-01-15`,
      expiryDate: null
    },
    achievement: achievementType ? { type: achievementType, rank, description: null } : null,
    education: null,
    employment: null,
    skills,
    tags,
    confidence,
    uncertainFields
  };
}
async function analyzeDocumentWithGemini(buffer, mimeType, fileName) {
  if (!GEMINI_API_KEY) {
    console.log(`[Gemini Intelligence] GEMINI_API_KEY not configured. Running offline document intelligence for "${fileName}".`);
    return analyzeDocumentOffline(buffer, mimeType, fileName);
  }
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini Intelligence] Analyzing "${fileName}" with ${model}...`);
      const rawText = await callGeminiApi(model, buffer, mimeType, fileName);
      const parsed = parseGeminiJson(rawText);
      console.log(`[Gemini Intelligence] Successfully processed "${fileName}" with ${model} (Confidence: ${parsed.confidence})`);
      return parsed;
    } catch (err) {
      console.warn(`[Gemini Intelligence] Model ${model} failed for "${fileName}":`, err.message);
    }
  }
  console.warn(`[Gemini Intelligence] All live Gemini models failed. Falling back to offline analyzer for "${fileName}".`);
  return analyzeDocumentOffline(buffer, mimeType, fileName);
}

// server/services/analyzer.ts
var ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];
var ALLOWED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".docx"
];
var MAX_FILE_SIZE = 15 * 1024 * 1024;
function validateFileSecurity(buffer, originalName, declaredMimeType) {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty file received. File has 0 bytes.", sha256: "", mimeType: declaredMimeType };
  }
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: `File exceeds maximum allowed size of 15MB (${(buffer.length / (1024 * 1024)).toFixed(2)}MB).`, sha256: "", mimeType: declaredMimeType };
  }
  const ext = path2.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Unsupported file extension: ${ext}. Supported: PDF, PNG, JPG, JPEG, WEBP, DOCX.`, sha256: "", mimeType: declaredMimeType };
  }
  const normalizedMime = declaredMimeType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    return { valid: false, error: `Unsupported MIME type: ${declaredMimeType}.`, sha256: "", mimeType: declaredMimeType };
  }
  if (ext === ".pdf") {
    const header = buffer.toString("utf-8", 0, 5);
    if (!header.startsWith("%PDF-")) {
      return { valid: false, error: "Corrupt or invalid PDF file header.", sha256: "", mimeType: declaredMimeType };
    }
  } else if (ext === ".png") {
    if (buffer.length < 8 || buffer[0] !== 137 || buffer[1] !== 80 || buffer[2] !== 78 || buffer[3] !== 71) {
      return { valid: false, error: "Corrupt or invalid PNG image file.", sha256: "", mimeType: declaredMimeType };
    }
  } else if (ext === ".jpg" || ext === ".jpeg") {
    if (buffer.length < 3 || buffer[0] !== 255 || buffer[1] !== 216 || buffer[2] !== 255) {
      return { valid: false, error: "Corrupt or invalid JPEG image file.", sha256: "", mimeType: declaredMimeType };
    }
  }
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  return {
    valid: true,
    sha256,
    mimeType: normalizedMime
  };
}
async function checkDuplicates(userId, sha256, extraction, currentDocId) {
  const existingDocs = await storage.getDocuments(userId);
  const exact = existingDocs.find(
    (d) => d.id !== currentDocId && d.duplicateOfId !== currentDocId && d.sha256 && d.sha256 === sha256
  );
  if (exact) {
    return { status: "exact_duplicate", duplicateOf: exact };
  }
  if (extraction.title && extraction.organization) {
    const similar = existingDocs.find((d) => {
      if (d.id === currentDocId) return false;
      const titleMatch = d.title && d.title.toLowerCase() === extraction.title?.toLowerCase();
      const orgMatch = d.organization && d.organization.toLowerCase() === extraction.organization?.toLowerCase();
      const personMatch = !d.personName && !extraction.person?.name || d.personName && extraction.person?.name && d.personName.toLowerCase() === extraction.person.name.toLowerCase();
      const dateMatch = !d.issueDate && !extraction.dates?.issueDate || d.issueDate && extraction.dates?.issueDate && d.issueDate === extraction.dates.issueDate;
      return titleMatch && orgMatch || titleMatch && personMatch && dateMatch;
    });
    if (similar) {
      return { status: "possible_duplicate", duplicateOf: similar };
    }
  }
  return { status: "unique" };
}
async function processDocumentIntelligence(documentId, buffer) {
  const doc = await storage.getDocument(documentId);
  if (!doc) return void 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await storage.updateDocument(doc.id, {
    processingStatus: "processing",
    updatedAt: now
  });
  try {
    const validation = validateFileSecurity(buffer, doc.originalName, doc.mimeType);
    if (!validation.valid) {
      const failedDoc = await storage.updateDocument(doc.id, {
        processingStatus: "failed",
        description: `Security validation error: ${validation.error}`,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      return failedDoc;
    }
    const sha256 = validation.sha256;
    const exactCheck = await checkDuplicates(doc.ownerId, sha256, {
      documentType: doc.documentType,
      subType: null,
      title: doc.originalName,
      person: { name: null },
      organization: null,
      dates: { issueDate: null, expiryDate: null },
      skills: [],
      tags: [],
      confidence: 1,
      uncertainFields: []
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
        confidence: exactCheck.duplicateOf?.confidence || 1,
        aiProcessed: true,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await storage.createAuditLog({
        userId: doc.ownerId,
        action: "DOCUMENT_AI_PROCESSED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Exact duplicate detected via SHA-256 (matches ${exactCheck.duplicateOf?.originalName})`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "WARNING"
      });
      return updated;
    }
    const extraction = await analyzeDocumentWithGemini(buffer, validation.mimeType, doc.originalName);
    const duplicateCheck = await checkDuplicates(doc.ownerId, sha256, extraction, doc.id);
    let processingStatus = "completed";
    if (extraction.confidence < 0.85 || extraction.uncertainFields && extraction.uncertainFields.length > 0) {
      processingStatus = "review_required";
    }
    if (duplicateCheck.status === "possible_duplicate") {
      processingStatus = "review_required";
    }
    const resolvedTags = Array.from(
      /* @__PURE__ */ new Set([
        ...doc.tags || [],
        ...extraction.tags || [],
        extraction.documentType,
        ...extraction.subType ? [extraction.subType] : []
      ])
    ).filter(Boolean);
    const issueDate = doc.issueDate || extraction.dates?.issueDate || null;
    const expiryDate = doc.expiryDate || extraction.dates?.expiryDate || null;
    const finalDocumentType = doc.documentType && doc.documentType !== "other" ? doc.documentType : extraction.documentType || "other";
    let resolvedStoragePath = doc.storagePath;
    if (finalDocumentType && doc.storagePath && !doc.storagePath.includes(`/documents/${finalDocumentType}/`)) {
      const userFolder = await storage.getUserFolder(doc.ownerId);
      const fileName = path2.basename(doc.storagePath);
      const targetStoragePath = `users/${userFolder}/documents/${finalDocumentType}/${fileName}`;
      try {
        await storage.moveFile(doc.storagePath, targetStoragePath);
        resolvedStoragePath = targetStoragePath;
        console.log(`[Storage] Relocated document ${doc.id} to clarified category folder: ${targetStoragePath}`);
      } catch (moveErr) {
        console.warn(`[Storage] Could not relocate file to ${targetStoragePath}:`, moveErr.message);
      }
    }
    const updatedDoc = await storage.updateDocument(doc.id, {
      sha256,
      documentType: finalDocumentType,
      storagePath: resolvedStoragePath,
      subType: extraction.subType || doc.subType,
      title: doc.title && doc.title !== doc.originalName ? doc.title : extraction.title || doc.originalName.replace(/\.[^/.]+$/, ""),
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
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await storage.createAuditLog({
      userId: doc.ownerId,
      action: "DOCUMENT_AI_PROCESSED",
      documentId: doc.id,
      documentName: doc.originalName,
      details: `AI classification: ${extraction.documentType}${extraction.subType ? ` (${extraction.subType})` : ""} - Confidence: ${(extraction.confidence * 100).toFixed(0)}%`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "SUCCESS"
    });
    await storage.createNotification({
      userId: doc.ownerId,
      title: processingStatus === "review_required" ? "Document Needs Review" : "Document Analyzed & Vaulted",
      message: processingStatus === "review_required" ? `"${doc.originalName}" was classified as ${extraction.documentType}, but requires review (${(extraction.confidence * 100).toFixed(0)}% confidence).` : `"${doc.originalName}" was organized under ${extraction.documentType}.`,
      type: "ai",
      read: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return updatedDoc;
  } catch (err) {
    console.error(`[Document Intelligence] Error processing document ${doc.id}:`, err);
    return await storage.updateDocument(doc.id, {
      processingStatus: "failed",
      description: `AI processing encountered an error: ${err.message}`,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}

// server/routes.ts
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  // 15MB limit
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file format. Supported: PDF, PNG, JPG, JPEG, WEBP, and DOCX."));
    }
  }
});
async function registerRoutes(httpServer2, app2) {
  setupAuth(app2);
  const requireAuth = (req, res, next) => {
    if (req.user || req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized. Please authenticate." });
  };
  app2.get("/api/debug-status", async (req, res) => {
    try {
      const userId = "1a06da63-2282-4a08-b17e-b57b188ca1ce";
      const supabase = getSupabaseAdmin();
      const bucket = getSupabaseBucketName();
      let usersList = null;
      let errorMsg = null;
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
        envServiceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
    } catch (e) {
      res.status(500).json({ error: e.message, stack: e.stack });
    }
  });
  app2.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      let docs = await storage.getDocuments(userId);
      const { category, status, search, tag } = req.query;
      if (category && typeof category === "string" && category !== "all") {
        const cat = category.toLowerCase();
        docs = docs.filter(
          (d) => d.documentType?.toLowerCase() === cat || d.subType?.toLowerCase() === cat
        );
      }
      if (status && typeof status === "string" && status !== "all") {
        const st = status.toLowerCase();
        docs = docs.filter(
          (d) => d.verificationStatus?.toLowerCase() === st || d.processingStatus?.toLowerCase() === st
        );
      }
      if (tag && typeof tag === "string" && tag !== "all") {
        const targetTag = tag.toLowerCase();
        docs = docs.filter((d) => d.tags && d.tags.some((t) => t.toLowerCase() === targetTag));
      }
      if (search && typeof search === "string" && search.trim() !== "") {
        const q = search.toLowerCase();
        docs = docs.filter(
          (d) => d.originalName.toLowerCase().includes(q) || d.title && d.title.toLowerCase().includes(q) || d.organization && d.organization.toLowerCase().includes(q) || d.personName && d.personName.toLowerCase().includes(q) || d.institution && d.institution.toLowerCase().includes(q) || d.certificateNumber && d.certificateNumber.toLowerCase().includes(q) || d.recipientName && d.recipientName.toLowerCase().includes(q) || d.tags && d.tags.some((t) => t.toLowerCase().includes(q)) || d.skills && d.skills.some((s) => s.toLowerCase().includes(q))
        );
      }
      docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      res.json(docs);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to retrieve documents" });
    }
  });
  app2.get("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id, req.user.id);
      const isOwner = doc && (doc.ownerId === req.user.id || doc.ownerId === req.user.email || doc.ownerId === req.user?.username || req.user.email && doc.ownerId === req.user.email.replace(/[^a-z0-9_-]/g, "_"));
      if (!doc || !isOwner || doc.isDeleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      await storage.createAuditLog({
        userId: req.user.id,
        action: "DOCUMENT_VIEWED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "Document metadata viewed",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      res.json(doc);
    } catch (err) {
      res.status(500).json({ message: err.message || "Error fetching document" });
    }
  });
  app2.post(
    "/api/documents",
    requireAuth,
    (req, res, next) => {
      upload.single("file")(req, res, (err) => {
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
        const userId = req.user.id;
        const validation = validateFileSecurity(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        if (!validation.valid) {
          return res.status(400).json({ message: validation.error || "File security check failed" });
        }
        const ext = path3.extname(req.file.originalname).toLowerCase();
        const documentId = randomUUID2();
        const secureFileName = `${documentId}${ext}`;
        const rawCategory = (req.body.documentType || "other").toLowerCase();
        const documentType = DocumentCategories.includes(rawCategory) ? rawCategory : "other";
        const storagePath = await storage.saveFile(
          userId,
          documentType,
          secureFileName,
          req.file.buffer
        );
        let verificationStatus = "Uploaded";
        if (documentType === "certificates" || documentType === "identity") {
          verificationStatus = "Unverified";
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const docRecord = {
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
          recipientName: req.body.recipientName || req.user.name || null,
          description: req.body.description || null,
          tags: req.body.tags ? Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags] : [],
          skills: req.body.skills ? Array.isArray(req.body.skills) ? req.body.skills : [req.body.skills] : [],
          confidence: 0,
          uncertainFields: [],
          uploadedAt: now,
          updatedAt: now
        };
        const created = await storage.createDocument(docRecord);
        await storage.createAuditLog({
          userId,
          action: "DOCUMENT_UPLOADED",
          documentId: created.id,
          documentName: created.originalName,
          details: `Uploaded to category ${created.documentType} (${(created.fileSize / (1024 * 1024)).toFixed(2)} MB)`,
          timestamp: now,
          status: "SUCCESS"
        });
        const processPromise = processDocumentIntelligence(created.id, req.file.buffer);
        if (req.query.sync === "true") {
          const finalDoc = await processPromise;
          return res.status(201).json(finalDoc || created);
        } else {
          processPromise.catch((err) => console.error(`[Background AI] Error on doc ${created.id}:`, err));
          return res.status(201).json(created);
        }
      } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ message: err.message || "Failed to upload document" });
      }
    }
  );
  app2.post(
    "/api/documents/batch",
    requireAuth,
    (req, res, next) => {
      upload.array("files", 20)(req, res, (err) => {
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
        const files = req.files;
        if (!files || files.length === 0) {
          return res.status(400).json({ message: "No files were uploaded." });
        }
        const userId = req.user.id;
        const results = [];
        const now = (/* @__PURE__ */ new Date()).toISOString();
        for (const file of files) {
          const validation = validateFileSecurity(file.buffer, file.originalname, file.mimetype);
          if (!validation.valid) continue;
          const ext = path3.extname(file.originalname).toLowerCase();
          const documentId = randomUUID2();
          const secureFileName = `${documentId}${ext}`;
          const documentType = "other";
          const storagePath = await storage.saveFile(
            userId,
            documentType,
            secureFileName,
            file.buffer
          );
          const docRecord = {
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
            updatedAt: now
          };
          const created = await storage.createDocument(docRecord);
          results.push(created);
          processDocumentIntelligence(created.id, file.buffer).catch(
            (err) => console.error(`[Background AI Batch] Error on doc ${created.id}:`, err)
          );
        }
        res.status(201).json({
          total: files.length,
          successful: results.length,
          documents: results
        });
      } catch (err) {
        console.error("Batch upload error:", err);
        res.status(500).json({ message: err.message || "Batch upload failed" });
      }
    }
  );
  app2.post("/api/documents/:id/reprocess", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Document not found" });
      }
      const filePath = storage.getFilePath(doc.storagePath);
      if (!fs2.existsSync(filePath)) {
        return res.status(404).json({ message: "Physical document file not found in storage" });
      }
      const fileBuffer = fs2.readFileSync(filePath);
      const updated = await storage.updateDocument(doc.id, {
        processingStatus: "processing",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      processDocumentIntelligence(doc.id, fileBuffer).catch(
        (err) => console.error(`[Background AI Reprocess] Error on doc ${doc.id}:`, err)
      );
      await storage.createAuditLog({
        userId: req.user.id,
        action: "DOCUMENT_REPROCESSED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "Document intelligence re-analysis initiated",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to reprocess document" });
    }
  });
  app2.post("/api/documents/:id/review", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Document not found" });
      }
      const { action, updates, ...directUpdates } = req.body;
      const combinedUpdates = {
        ...updates || {},
        ...directUpdates
      };
      delete combinedUpdates.action;
      delete combinedUpdates.id;
      if (combinedUpdates.documentType && combinedUpdates.documentType !== doc.documentType && doc.storagePath) {
        const userFolder = await storage.getUserFolder(doc.ownerId);
        const fileName = path3.basename(doc.storagePath);
        const newCategory = String(combinedUpdates.documentType).toLowerCase();
        const targetStoragePath = `users/${userFolder}/documents/${newCategory}/${fileName}`;
        if (doc.storagePath !== targetStoragePath) {
          try {
            await storage.moveFile(doc.storagePath, targetStoragePath);
            combinedUpdates.storagePath = targetStoragePath;
            console.log(`[Storage] Relocated file on human review reclassification: ${targetStoragePath}`);
          } catch (moveErr) {
            console.warn("[Storage] Warning moving file on review reclassification:", moveErr.message);
          }
        }
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const updated = await storage.updateDocument(doc.id, {
        ...combinedUpdates,
        processingStatus: "completed",
        updatedAt: now
      });
      await storage.createAuditLog({
        userId: req.user.id,
        action: "DOCUMENT_REVIEWED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Human review finalized with action: ${action || "accepted"}`,
        timestamp: now,
        status: "SUCCESS"
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to finalize review" });
    }
  });
  app2.post("/api/documents/:id/resolve-duplicate", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Document not found" });
      }
      const { action, targetDocId } = req.body;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (action === "replace" && targetDocId) {
        const targetDoc = await storage.getDocument(targetDocId);
        if (targetDoc && targetDoc.ownerId === req.user.id) {
          await storage.deleteFile(targetDoc.storagePath);
          await storage.deleteDocument(targetDoc.id);
        }
      }
      const updated = await storage.updateDocument(doc.id, {
        duplicateStatus: "unique",
        processingStatus: "completed",
        updatedAt: now
      });
      await storage.createAuditLog({
        userId: req.user.id,
        action: "DUPLICATE_RESOLVED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Duplicate status resolved: ${action === "replace" ? "Replaced existing" : "Retained both"}`,
        timestamp: now,
        status: "SUCCESS"
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to resolve duplicate" });
    }
  });
  app2.post("/api/documents/:id/tags", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.ownerId !== req.user.id) {
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
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to update tags" });
    }
  });
  app2.get("/api/documents-tags", requireAuth, async (req, res) => {
    try {
      const docs = await storage.getDocuments(req.user.id);
      const tagSet = /* @__PURE__ */ new Set();
      for (const d of docs) {
        if (d.tags && Array.isArray(d.tags)) {
          d.tags.forEach((t) => tagSet.add(t));
        }
      }
      res.json(Array.from(tagSet));
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to load tags" });
    }
  });
  app2.patch("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Document not found" });
      }
      const parsed = updateDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const updated = await storage.updateDocument(doc.id, parsed.data);
      await storage.createAuditLog({
        userId: req.user.id,
        action: "DOCUMENT_UPDATED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "Document metadata updated",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to update document" });
    }
  });
  app2.delete("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Document not found" });
      }
      await storage.trashDocument(doc.id);
      await storage.createAuditLog({
        userId: req.user.id,
        action: "DOCUMENT_TRASHED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "Document moved to 30-day trash bin",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to move document to trash" });
    }
  });
  app2.post("/api/documents/:id/restore", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Document not found" });
      }
      const restored = await storage.restoreDocument(doc.id);
      await storage.createAuditLog({
        userId: req.user.id,
        action: "DOCUMENT_RESTORED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "Document restored from 30-day trash bin",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      res.json(restored);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to restore document" });
    }
  });
  app2.delete("/api/documents/:id/permanent", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Document not found" });
      }
      await storage.permanentDeleteDocument(doc.id);
      await storage.createAuditLog({
        userId: req.user.id,
        action: "DOCUMENT_DELETED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "Document and storage assets permanently purged",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to permanently purge document" });
    }
  });
  app2.post("/api/documents/:id/pin", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc || doc.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Document not found" });
      }
      const updated = await storage.togglePinDocument(doc.id);
      await storage.createAuditLog({
        userId: req.user.id,
        action: updated?.isPinned ? "DOCUMENT_PINNED" : "DOCUMENT_UNPINNED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: updated?.isPinned ? "Pinned to Quick Access" : "Unpinned from Quick Access",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to toggle pin" });
    }
  });
  app2.get("/api/trash", requireAuth, async (req, res) => {
    try {
      const trashed = await storage.getTrashDocuments(req.user.id);
      res.json(trashed);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to fetch trash" });
    }
  });
  app2.delete("/api/trash/empty", requireAuth, async (req, res) => {
    try {
      const count = await storage.emptyTrash(req.user.id);
      await storage.createAuditLog({
        userId: req.user.id,
        action: "TRASH_EMPTIED",
        details: `Purged ${count} trashed documents permanently`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      res.json({ deletedCount: count });
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to empty trash" });
    }
  });
  app2.get("/api/documents/:id/download", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id, req.user.id);
      const isOwner = doc && (doc.ownerId === req.user.id || doc.ownerId === req.user.email || doc.ownerId === req.user?.username || req.user.email && doc.ownerId === req.user.email.replace(/[^a-z0-9_-]/g, "_"));
      if (!doc || !isOwner || doc.isDeleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      const filePath = storage.getFilePath(doc.storagePath);
      if (!fs2.existsSync(filePath)) {
        return res.status(404).json({ message: "Physical file not found in storage" });
      }
      await storage.createAuditLog({
        userId: req.user.id,
        action: "DOCUMENT_DOWNLOADED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: "File downloaded",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      res.download(filePath, doc.originalName);
    } catch (err) {
      res.status(500).json({ message: err.message || "Download failed" });
    }
  });
  app2.get("/api/documents/:id/preview", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id, req.user.id);
      const isOwner = doc && (doc.ownerId === req.user.id || doc.ownerId === req.user.email || doc.ownerId === req.user?.username || req.user.email && doc.ownerId === req.user.email.replace(/[^a-z0-9_-]/g, "_"));
      if (!doc || !isOwner || doc.isDeleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      const filePath = storage.getFilePath(doc.storagePath);
      if (!fs2.existsSync(filePath)) {
        return res.status(404).json({ message: "Physical file not found in storage" });
      }
      res.set({
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate"
      });
      res.sendFile(path3.resolve(filePath));
    } catch (err) {
      res.status(500).json({ message: err.message || "Preview failed" });
    }
  });
  app2.get("/api/shares", requireAuth, async (req, res) => {
    try {
      const shares = await storage.getUserShares(req.user.id);
      res.json(shares);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to retrieve user shares" });
    }
  });
  app2.post("/api/shares", requireAuth, async (req, res) => {
    try {
      const parsed = createShareSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { documentId, expiresInHours, accessLimit, allowedFields, permission } = parsed.data;
      const doc = await storage.getDocument(documentId, req.user.id);
      const isOwner = doc && (doc.ownerId === req.user.id || doc.ownerId === req.user.email || doc.ownerId === req.user?.username || req.user.email && doc.ownerId === req.user.email.replace(/[^a-z0-9_-]/g, "_"));
      if (!doc || !isOwner) {
        return res.status(404).json({ message: "Document not found" });
      }
      let expiresAt = null;
      if (expiresInHours && expiresInHours > 0) {
        const expiry = /* @__PURE__ */ new Date();
        expiry.setHours(expiry.getHours() + expiresInHours);
        expiresAt = expiry.toISOString();
      }
      const shareId = `fv_${randomUUID2().replace(/-/g, "").slice(0, 16)}`;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const shareRecord = {
        id: shareId,
        documentId: doc.id,
        ownerId: req.user.id,
        documentName: doc.originalName,
        documentType: doc.documentType,
        expiresAt,
        accessLimit: accessLimit || null,
        accessCount: 0,
        status: "ACTIVE",
        allowedFields: allowedFields || ["documentType", "institution", "recipientName", "issueDate", "expiryDate", "certificateNumber"],
        permission: permission || "both",
        createdAt: now
      };
      const created = await storage.createShare(shareRecord);
      await storage.createAuditLog({
        userId: req.user.id,
        action: "DOCUMENT_SHARED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Share created (ID: ${shareId}, Permission: ${permission || "both"}, Expires: ${expiresAt || "Never"}, Limit: ${accessLimit || "Unlimited"})`,
        timestamp: now,
        status: "SUCCESS"
      });
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to create share link" });
    }
  });
  app2.get("/api/shares/document/:documentId", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.documentId, req.user.id);
      const isOwner = doc && (doc.ownerId === req.user.id || doc.ownerId === req.user.email || doc.ownerId === req.user?.username || req.user.email && doc.ownerId === req.user.email.replace(/[^a-z0-9_-]/g, "_"));
      if (!doc || !isOwner) {
        return res.status(404).json({ message: "Document not found" });
      }
      const shares = await storage.getSharesForDocument(doc.id, req.user.id);
      res.json(shares);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to retrieve shares" });
    }
  });
  app2.delete("/api/shares/:id", requireAuth, async (req, res) => {
    try {
      const share = await storage.getShare(req.params.id);
      if (!share || share.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Share link not found" });
      }
      await storage.updateShare(share.id, { status: "REVOKED" });
      await storage.createAuditLog({
        userId: req.user.id,
        action: "SHARE_REVOKED",
        documentId: share.documentId,
        details: `Share ${share.id} revoked`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to revoke share" });
    }
  });
  app2.get("/api/shares/:id/preview", async (req, res) => {
    try {
      const share = await storage.getShare(req.params.id);
      if (!share) {
        return res.status(404).json({ message: "Share link not found" });
      }
      if (share.status === "REVOKED") {
        return res.status(403).json({ message: "This share link has been revoked by the owner." });
      }
      if (share.expiresAt && /* @__PURE__ */ new Date() > new Date(share.expiresAt)) {
        await storage.updateShare(share.id, { status: "EXPIRED" });
        return res.status(403).json({ message: "This share link has expired." });
      }
      if (share.accessLimit !== null && share.accessCount >= share.accessLimit) {
        await storage.updateShare(share.id, { status: "LIMIT_REACHED" });
        return res.status(403).json({ message: "The access limit for this share link has been reached." });
      }
      if (share.permission === "download") {
        return res.status(403).json({ message: "This share link is configured for download only." });
      }
      const doc = await storage.getDocument(share.documentId);
      if (!doc) {
        return res.status(404).json({ message: "Associated document no longer exists." });
      }
      await storage.updateShare(share.id, { accessCount: share.accessCount + 1 });
      await storage.createAuditLog({
        userId: share.ownerId,
        action: "SHARE_ACCESSED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Recipient previewed shared document via token ${share.id}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      const filePath = storage.getFilePath(doc.storagePath);
      res.set({
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`
      });
      res.sendFile(path3.resolve(filePath));
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to preview shared document" });
    }
  });
  app2.get("/api/shares/:id/download", async (req, res) => {
    try {
      const share = await storage.getShare(req.params.id);
      if (!share) {
        return res.status(404).json({ message: "Share link not found" });
      }
      if (share.status === "REVOKED") {
        return res.status(403).json({ message: "This share link has been revoked." });
      }
      if (share.expiresAt && /* @__PURE__ */ new Date() > new Date(share.expiresAt)) {
        await storage.updateShare(share.id, { status: "EXPIRED" });
        return res.status(403).json({ message: "This share link has expired." });
      }
      if (share.accessLimit !== null && share.accessCount >= share.accessLimit) {
        await storage.updateShare(share.id, { status: "LIMIT_REACHED" });
        return res.status(403).json({ message: "The access limit for this share link has been reached." });
      }
      if (share.permission === "view") {
        return res.status(403).json({ message: "This share link is view-only. Downloading is disabled." });
      }
      const doc = await storage.getDocument(share.documentId);
      if (!doc) {
        return res.status(404).json({ message: "Document not found." });
      }
      await storage.updateShare(share.id, { accessCount: share.accessCount + 1 });
      await storage.createAuditLog({
        userId: share.ownerId,
        action: "DOCUMENT_DOWNLOADED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Recipient downloaded document via share link ${share.id}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      const filePath = storage.getFilePath(doc.storagePath);
      res.download(filePath, doc.originalName);
    } catch (err) {
      res.status(500).json({ message: err.message || "Download failed" });
    }
  });
  app2.get("/api/verify/:shareId", async (req, res) => {
    try {
      const share = await storage.getShare(req.params.shareId);
      if (!share) {
        return res.status(404).json({ message: "Verification record not found or invalid." });
      }
      const isExpired = !!(share.expiresAt && /* @__PURE__ */ new Date() > new Date(share.expiresAt));
      if (isExpired && share.status === "ACTIVE") {
        await storage.updateShare(share.id, { status: "EXPIRED" });
        share.status = "EXPIRED";
      }
      const isLimitReached = !!(share.accessLimit !== null && share.accessCount >= share.accessLimit);
      if (isLimitReached && share.status === "ACTIVE") {
        await storage.updateShare(share.id, { status: "LIMIT_REACHED" });
        share.status = "LIMIT_REACHED";
      }
      const doc = await storage.getDocument(share.documentId);
      if (!doc) {
        return res.status(404).json({ message: "Associated document record no longer exists." });
      }
      await storage.createAuditLog({
        userId: share.ownerId,
        action: "VERIFICATION_REQUESTED",
        documentId: doc.id,
        documentName: doc.originalName,
        details: `Public credential verification viewed for FV-${share.id.toUpperCase().slice(0, 8)}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "SUCCESS"
      });
      const canView = share.status === "ACTIVE" && !isExpired && !isLimitReached;
      const canDownload = canView && share.permission !== "view";
      const canPreview = canView && share.permission !== "download";
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
        permission: share.permission || "both",
        isExpired,
        canViewFile: canPreview,
        canDownload,
        filePreviewUrl: canPreview ? `/api/shares/${share.id}/preview` : null,
        downloadUrl: canDownload ? `/api/shares/${share.id}/download` : null
      });
    } catch (err) {
      res.status(500).json({ message: err.message || "Verification request failed" });
    }
  });
  app2.get("/api/audit-logs", requireAuth, async (req, res) => {
    try {
      const logs = await storage.getAuditLogs(req.user.id);
      const isExportAll = req.query.all === "true" || req.query.export === "true";
      if (isExportAll) {
        return res.json(logs);
      }
      const activityActions = /* @__PURE__ */ new Set([
        "DOCUMENT_UPLOADED",
        "UPLOAD",
        "DOCUMENT_TRASHED",
        "DOCUMENT_DELETED",
        "DELETE",
        "DOCUMENT_SHARED",
        "SHARE",
        "SHARE_CREATED"
      ]);
      if (req.query.activity === "true" || req.query.filter === "activity" || req.query.type === "recent") {
        const filtered = logs.filter((log) => log.action && activityActions.has(log.action.toUpperCase()));
        return res.json(filtered);
      }
      if (req.query.actions) {
        const requested = new Set(
          String(req.query.actions).split(",").map((a) => a.trim().toUpperCase())
        );
        const filtered = logs.filter((log) => log.action && requested.has(log.action.toUpperCase()));
        return res.json(filtered);
      }
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to fetch audit logs" });
    }
  });
  app2.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const docs = await storage.getDocuments(userId);
      const now = /* @__PURE__ */ new Date();
      const in30Days = /* @__PURE__ */ new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      const totalDocuments = docs.length;
      const totalCertificates = docs.filter((d) => d.documentType === "certificate" || d.documentType === "certificates" || d.documentType === "professional").length;
      const totalAchievements = docs.filter((d) => d.documentType === "achievement" || d.documentType === "hackathon").length;
      const totalHackathons = docs.filter((d) => d.documentType === "hackathon" || d.subType === "hackathon" || d.tags && d.tags.includes("Hackathon")).length;
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
          other: totalOther
        },
        byProcessingStatus: {
          uploaded: docs.filter((d) => d.processingStatus === "uploaded").length,
          processing: docs.filter((d) => d.processingStatus === "processing").length,
          review_required: needsReviewCount,
          completed: docs.filter((d) => d.processingStatus === "completed").length,
          duplicate: duplicateCount
        },
        needsReviewCount,
        duplicateCount,
        duplicatesCount: duplicateCount,
        expiringSoon,
        verifiedDocuments,
        sharedDocuments: sharedCount,
        totalStorageBytes
      });
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to load dashboard metrics" });
    }
  });
  app2.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const list = await storage.getNotifications(req.user.id);
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to fetch notifications" });
    }
  });
  app2.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const success = await storage.markNotificationRead(req.params.id, req.user.id);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ message: err.message || "Failed to update notification" });
    }
  });
  return httpServer2;
}

// server/serverless.ts
import { createServer } from "http";
var app = express();
var httpServer = createServer(app);
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: false }));
var isReady = false;
var initPromise = null;
async function ensureInit() {
  if (isReady) return;
  if (!initPromise) {
    initPromise = (async () => {
      await registerRoutes(httpServer, app);
      app.use((err, _req, res, next) => {
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
async function handler(req, res) {
  await ensureInit();
  return app(req, res);
}
export {
  handler as default
};
