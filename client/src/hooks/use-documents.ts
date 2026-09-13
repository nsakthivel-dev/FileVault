import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { DocumentRecord, ShareRecord, AuditLogRecord, NotificationRecord } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseClientConfigured } from "@/lib/supabase";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (isSupabaseClientConfigured && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers["Authorization"] = `Bearer ${data.session.access_token}`;
      }
    } catch {}
  }
  return headers;
}

export function useDocuments(filters?: { category?: string; status?: string; search?: string; tag?: string }) {
  const queryParams = new URLSearchParams();
  if (filters?.category && filters.category !== "all") queryParams.set("category", filters.category);
  if (filters?.status && filters.status !== "all") queryParams.set("status", filters.status);
  if (filters?.search) queryParams.set("search", filters.search);
  if (filters?.tag && filters.tag !== "all") queryParams.set("tag", filters.tag);

  const queryString = queryParams.toString();
  const path = queryString ? `${api.documents.list.path}?${queryString}` : api.documents.list.path;

  return useQuery<DocumentRecord[]>({
    queryKey: [api.documents.list.path, filters],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(path, { credentials: "include", headers });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return await res.json();
    },
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const docs = query.state.data;
      if (docs && docs.some((d: any) => d.processingStatus === "uploaded" || d.processingStatus === "processing")) {
        return 2000;
      }
      return false;
    },
  });
}

export function useDocument(id: string) {
  return useQuery<DocumentRecord | null>({
    queryKey: [api.documents.get.path, id],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const url = buildUrl(api.documents.get.path, { id });
      const res = await fetch(url, { credentials: "include", headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch document");
      return await res.json();
    },
    enabled: !!id,
  });
}

export interface UploadDocumentParams {
  file: File;
  documentType: string;
  issueDate?: string;
  expiryDate?: string;
  certificateNumber?: string;
  institution?: string;
  recipientName?: string;
  description?: string;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: UploadDocumentParams) => {
      const formData = new FormData();
      formData.append("file", params.file);
      formData.append("documentType", params.documentType);
      if (params.issueDate) formData.append("issueDate", params.issueDate);
      if (params.expiryDate) formData.append("expiryDate", params.expiryDate);
      if (params.certificateNumber) formData.append("certificateNumber", params.certificateNumber);
      if (params.institution) formData.append("institution", params.institution);
      if (params.recipientName) formData.append("recipientName", params.recipientName);
      if (params.description) formData.append("description", params.description);

      const res = await fetch(api.documents.upload.path, {
        method: api.documents.upload.method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message || "Failed to upload document");
      }
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      await queryClient.refetchQueries({ queryKey: [api.documents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.auditLogs.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
      toast({ title: "Upload Complete", description: "Document stored in vault and secured." });
    },
    onError: (error: Error) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useBatchUpload() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/documents/batch", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Batch upload failed" }));
        throw new Error(err.message || "Failed to upload batch files");
      }
      return await res.json();
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      await queryClient.refetchQueries({ queryKey: [api.documents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.auditLogs.list.path] });
      const count = Array.isArray(data) ? data.length : (data.successful ?? data.total ?? data.documents?.length ?? 1);
      toast({
        title: "Batch Upload Successful",
        description: `${count} document${count > 1 ? "s" : ""} uploaded and queued for AI intelligence.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Batch Upload Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useReprocessDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}/reprocess`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Reprocess failed" }));
        throw new Error(err.message || "Failed to reprocess document");
      }
      return await res.json();
    },
    onSuccess: (doc: DocumentRecord) => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.documents.get.path, doc.id] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      toast({ title: "AI Re-analysis Complete", description: `Re-analyzed as ${doc.documentType}.` });
    },
    onError: (error: Error) => {
      toast({ title: "Reprocess Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useReviewDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, action, updates }: { id: string; action: "accept" | "edit" | "reclassify"; updates?: Partial<DocumentRecord> }) => {
      const res = await fetch(`/api/documents/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, updates }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Review resolution failed" }));
        throw new Error(err.message || "Failed to finalize review");
      }
      return await res.json();
    },
    onSuccess: (doc: DocumentRecord) => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.documents.get.path, doc.id] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      toast({ title: "Review Finalized", description: "Metadata saved and vaulted." });
    },
    onError: (error: Error) => {
      toast({ title: "Review Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useResolveDuplicate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, action, targetDocId }: { id: string; action: "keep" | "replace"; targetDocId?: string }) => {
      const res = await fetch(`/api/documents/${id}/resolve-duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetDocId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Duplicate resolution failed" }));
        throw new Error(err.message || "Failed to resolve duplicate");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      toast({ title: "Duplicate Resolved", description: "Vault records updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Action Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useDocumentTags() {
  return useQuery<string[]>({
    queryKey: ["/api/documents-tags"],
    queryFn: async () => {
      const res = await fetch("/api/documents-tags", { credentials: "include" });
      if (!res.ok) return [];
      return await res.json();
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DocumentRecord> }) => {
      const url = buildUrl(api.documents.update.path, { id });
      const res = await fetch(url, {
        method: api.documents.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Update failed" }));
        throw new Error(err.message || "Failed to update document metadata");
      }
      return await res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.documents.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      toast({ title: "Document Updated", description: "Metadata updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.documents.delete.path, { id });
      const res = await fetch(url, {
        method: api.documents.delete.method,
        credentials: "include",
      });
      if (res.status === 404) throw new Error("Document not found");
      if (!res.ok) throw new Error("Failed to move document to trash");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.trash.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.auditLogs.list.path] });
      toast({ title: "Moved to Trash", description: "File will be kept in trash for 30 days." });
    },
    onError: (error: Error) => {
      toast({ title: "Action Failed", description: error.message, variant: "destructive" });
    },
  });
}

// Dashboard Stats hook
export function useDashboardStats() {
  return useQuery({
    queryKey: [api.stats.get.path],
    queryFn: async () => {
      const res = await fetch(api.stats.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
      return await res.json();
    },
  });
}

// Audit Logs hook
export function useAuditLogs(options?: { activity?: boolean; all?: boolean }) {
  const queryStr = options?.activity ? "?activity=true" : options?.all ? "?all=true" : "";
  return useQuery<AuditLogRecord[]>({
    queryKey: [api.auditLogs.list.path, options],
    queryFn: async () => {
      const res = await fetch(`${api.auditLogs.list.path}${queryStr}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      return await res.json();
    },
  });
}

// Notifications hook
export function useNotifications() {
  return useQuery<NotificationRecord[]>({
    queryKey: [api.notifications.list.path],
    queryFn: async () => {
      const res = await fetch(api.notifications.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return await res.json();
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.notifications.markRead.path, { id });
      await fetch(url, {
        method: api.notifications.markRead.method,
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
    },
  });
}

// Sharing hooks
export function useSharesForDocument(documentId: string) {
  return useQuery<ShareRecord[]>({
    queryKey: [api.shares.listForDocument.path, documentId],
    queryFn: async () => {
      const url = buildUrl(api.shares.listForDocument.path, { documentId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shares");
      return await res.json();
    },
    enabled: !!documentId,
  });
}

// User Shares hook (all shares generated by user)
export function useUserShares() {
  return useQuery<ShareRecord[]>({
    queryKey: [api.shares.list.path],
    queryFn: async () => {
      const res = await fetch(api.shares.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user shares");
      return await res.json();
    },
  });
}

export function useCreateShare() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { 
      documentId: string; 
      expiresInHours?: number | null; 
      accessLimit?: number | null; 
      permission?: "view" | "download" | "both";
      allowedFields?: string[];
    }) => {
      const res = await fetch(api.shares.create.path, {
        method: api.shares.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to generate share" }));
        throw new Error(err.message || "Failed to create share link");
      }
      return await res.json();
    },
    onSuccess: (newShare: ShareRecord) => {
      queryClient.invalidateQueries({ queryKey: [api.shares.listForDocument.path, newShare.documentId] });
      queryClient.invalidateQueries({ queryKey: [api.shares.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.auditLogs.list.path] });
      toast({ title: "Share Link Generated", description: "Secure link ready to share." });
    },
    onError: (error: Error) => {
      toast({ title: "Share Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useRevokeShare() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, documentId }: { id: string; documentId?: string }) => {
      const url = buildUrl(api.shares.revoke.path, { id });
      const res = await fetch(url, {
        method: api.shares.revoke.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to revoke share");
    },
    onSuccess: (_, { documentId }) => {
      if (documentId) {
        queryClient.invalidateQueries({ queryKey: [api.shares.listForDocument.path, documentId] });
      }
      queryClient.invalidateQueries({ queryKey: [api.shares.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.auditLogs.list.path] });
      toast({ title: "Share Revoked", description: "Access link is no longer valid." });
    },
    onError: (error: Error) => {
      toast({ title: "Revocation Failed", description: error.message, variant: "destructive" });
    },
  });
}

// Trash Hooks (30-day retention)
export function useTrashDocuments() {
  return useQuery<(DocumentRecord & { daysRemaining: number })[]>({
    queryKey: [api.trash.list.path],
    queryFn: async () => {
      const res = await fetch(api.trash.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trash records");
      return await res.json();
    },
  });
}

export function useRestoreDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.trash.restore.path, { id });
      const res = await fetch(url, {
        method: api.trash.restore.method,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Restore failed" }));
        throw new Error(err.message || "Failed to restore document");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.trash.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.auditLogs.list.path] });
      toast({ title: "Document Restored", description: "File restored to your vault." });
    },
    onError: (error: Error) => {
      toast({ title: "Restore Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function usePermanentDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.trash.permanentDelete.path, { id });
      const res = await fetch(url, {
        method: api.trash.permanentDelete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to permanently delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.trash.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.auditLogs.list.path] });
      toast({ title: "Permanently Deleted", description: "File and cryptographic anchors purged." });
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useEmptyTrash() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.trash.empty.path, {
        method: api.trash.empty.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to empty trash");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.trash.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.auditLogs.list.path] });
      toast({ title: "Trash Emptied", description: `${data.deletedCount} items permanently deleted.` });
    },
    onError: (error: Error) => {
      toast({ title: "Empty Trash Failed", description: error.message, variant: "destructive" });
    },
  });
}

// Pin Quick Access Hook
export function useTogglePinDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildUrl(api.documents.pin.path, { id });
      const res = await fetch(url, {
        method: api.documents.pin.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle pin");
      return await res.json();
    },
    onSuccess: (doc: DocumentRecord) => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.documents.get.path, doc.id] });
      toast({
        title: doc.isPinned ? "Pinned to Quick Access" : "Unpinned",
        description: doc.isPinned ? `"${doc.originalName}" added to quick access.` : `"${doc.originalName}" removed from quick access.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Pin Toggle Failed", description: error.message, variant: "destructive" });
    },
  });
}
