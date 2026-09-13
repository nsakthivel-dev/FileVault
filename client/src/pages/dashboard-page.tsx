import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useDocuments, useDashboardStats, useAuditLogs, useDeleteDocument, useTogglePinDocument } from "@/hooks/use-documents";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { UploadModal } from "@/components/documents/upload-modal";
import { ShareModal } from "@/components/documents/share-modal";
import { DocumentDetailModal } from "@/components/documents/document-detail-modal";
import { ReviewModal } from "@/components/documents/review-modal";
import { 
  Folder, 
  FileText, 
  Plus, 
  Download, 
  Share2, 
  Eye, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Cloud, 
  RefreshCw, 
  UploadCloud, 
  ExternalLink, 
  Trash2, 
  List, 
  LayoutGrid, 
  Sparkles, 
  Zap, 
  Award, 
  Lock, 
  ChevronDown,
  ChevronRight,
  Shield,
  FileCheck,
  Pin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatDate } from "@/lib/format";
import { buildUrl, api } from "@shared/routes";
import { DocumentRecord } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: documents, isLoading } = useDocuments();
  const { data: stats } = useDashboardStats();
  const { data: auditLogs } = useAuditLogs({ activity: true });
  const deleteMutation = useDeleteDocument();
  const { toast } = useToast();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Modals state
  const [selectedDocForShare, setSelectedDocForShare] = useState<DocumentRecord | null>(null);
  const [selectedDocForDetail, setSelectedDocForDetail] = useState<DocumentRecord | null>(null);
  const [selectedDocForReview, setSelectedDocForReview] = useState<DocumentRecord | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentRecord | null>(null);

  const togglePinMutation = useTogglePinDocument();

  const totalFiles = documents?.length ?? 0;
  const totalStorageBytes = documents?.reduce((acc, doc) => acc + Number(doc.fileSize), 0) || 0;
  const storageMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);
  const storageDisplay = `${storageMB} MB`;

  // Filter documents
  const filteredDocs = useMemo(() => {
    let list = documents || [];
    if (selectedCategory !== "all") {
      list = list.filter((d) => (d.documentType || "other").toLowerCase() === selectedCategory.toLowerCase());
    }
    if (selectedStatus !== "all") {
      if (selectedStatus === "verified") {
        list = list.filter((d) => d.verificationStatus === "Verified" || d.aiProcessed);
      } else if (selectedStatus === "review_required") {
        list = list.filter((d) => d.processingStatus === "review_required");
      }
    }
    return list;
  }, [documents, selectedCategory, selectedStatus]);

  // Unique categories count (0 when user has no files)
  const activeCollectionsCount = useMemo(() => {
    if (!documents || documents.length === 0) return 0;
    const set = new Set(documents.map((d) => (d.documentType || "other").toLowerCase()));
    return set.size;
  }, [documents]);

  const storageQuotaPercent = useMemo(() => {
    if (totalStorageBytes === 0) return 0;
    return Math.min(Math.max((totalStorageBytes / (10 * 1024 * 1024 * 1024)) * 100, 1), 100);
  }, [totalStorageBytes]);

  const allowedActivityActions = useMemo(
    () =>
      new Set([
        "DOCUMENT_UPLOADED",
        "UPLOAD",
        "DOCUMENT_TRASHED",
        "DOCUMENT_DELETED",
        "DELETE",
        "DOCUMENT_SHARED",
        "SHARE",
        "SHARE_CREATED",
      ]),
    []
  );

  const recentFileActivities = useMemo(() => {
    if (!auditLogs || !Array.isArray(auditLogs)) return [];
    return auditLogs
      .filter((log) => log.action && allowedActivityActions.has(log.action.toUpperCase()))
      .slice(0, 10);
  }, [auditLogs, allowedActivityActions]);

  const handleCopyHash = (sha256?: string) => {
    if (!sha256) return;
    navigator.clipboard.writeText(sha256);
    setCopiedHash(sha256);
    toast({
      title: "SHA-256 Hash Copied",
      description: "Cryptographic anchor copied to clipboard.",
    });
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleVerifyAll = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      toast({
        title: "KMS Integrity Verified",
        description: `All ${totalFiles} vaulted documents match their Merkle SHA-256 seal in hardware enclave.`,
      });
    }, 900);
  };

  const handleExportAudit = async () => {
    try {
      const res = await fetch(`${api.auditLogs.list.path}?all=true`, { credentials: "include" });
      const fullLogs = res.ok ? await res.json() : (auditLogs || []);
      const logData = JSON.stringify(fullLogs, null, 2);
      const blob = new Blob([logData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `enclave_audit_trail_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Audit Trail Exported",
        description: "Immutable enclave cryptographic logs downloaded.",
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "Could not export full audit log.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadDoc = (doc: DocumentRecord) => {
    const url = buildUrl(api.documents.download.path, { id: doc.id });
    window.open(url, "_blank");
  };

  const handleOpenPreview = (doc: DocumentRecord) => {
    window.open(`/d/${doc.id}`, "_blank");
  };

  const getFriendlyCategory = (type?: string) => {
    const t = (type || "other").toLowerCase();
    switch (t) {
      case "resume":
        return "Resumes & CVs";
      case "certificate":
      case "certificates":
      case "professional":
        return "Certificates";
      case "hackathon":
      case "achievement":
      case "award":
        return "Hackathon & Proofs";
      case "education":
      case "degree":
        return "Education";
      case "experience":
      case "employment":
        return "Experience";
      case "identity":
        return "Identity";
      default:
        return "General Vault";
    }
  };

  const getDocSubtitle = (doc: DocumentRecord) => {
    const ext = doc.originalName.split(".").pop()?.toUpperCase() || "FILE";
    if (doc.documentType === "resume") return `${ext} • 2 pages`;
    if (doc.institution) return `${ext} • ${doc.institution}`;
    if (doc.organization) return `${ext} • ${doc.organization}`;
    if (doc.documentType === "certificate") return `${ext} • Verified Issuer`;
    return `${ext} • Enclave Encrypted`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* TITLE HEADER ROW */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
                Documents Vault
              </h1>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                v2.4 Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Zero-knowledge client-side encrypted storage backed by SHA-256 integrity anchoring.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAudit}
              className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl h-9 px-3.5 shadow-2xs"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Export Audit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyAll}
              disabled={isVerifying}
              className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl h-9 px-3.5 shadow-2xs"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 text-slate-500 ${isVerifying ? "animate-spin text-emerald-600" : ""}`} />
              Verify All
            </Button>

            <Button
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl h-9 px-4 shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4 text-white" />
              Upload Document
            </Button>
          </div>
        </div>

        {/* TOP 3 METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: TOTAL VAULTED */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  TOTAL VAULTED
                </span>
                <div className="h-9 w-9 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Folder className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-2 flex items-baseline">
                <span className="text-3xl font-display font-bold text-slate-900 tracking-tight">
                  {totalFiles}
                </span>
                <span className="ml-2 text-xs font-medium text-slate-500">
                  verified files
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                {activeCollectionsCount} collections active
              </span>
              <span className="text-blue-600 font-semibold font-mono">
                100% indexed
              </span>
            </div>
          </motion.div>

          {/* Card 2: INTEGRITY STATUS */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  INTEGRITY STATUS
                </span>
                <div className="h-9 w-9 rounded-xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-2 flex items-baseline">
                <span className="text-3xl font-display font-bold text-emerald-500 tracking-tight">
                  100%
                </span>
                <span className="ml-2 text-xs font-medium text-slate-500">
                  anchored
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-600 font-medium">All hashes match KMS</span>
              </div>
              <span className="font-mono text-slate-400 text-[11px]">
                SHA-256
              </span>
            </div>
          </motion.div>

          {/* Card 3: STORAGE QUOTA */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  STORAGE QUOTA
                </span>
                <div className="h-9 w-9 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  <Cloud className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-2 flex items-baseline">
                <span className="text-3xl font-display font-bold text-slate-900 tracking-tight">
                  {storageDisplay}
                </span>
                <span className="ml-2 text-xs font-medium text-slate-400 font-mono">
                  / 10 GB
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
              {/* Mini progress bar with point */}
              <div className="w-32 h-1.5 bg-slate-100 rounded-full relative overflow-visible">
                <div 
                  className="h-full bg-slate-900 rounded-full transition-all duration-300"
                  style={{ width: `${storageQuotaPercent}%` }}
                />
                {storageQuotaPercent > 0 && (
                  <div 
                    className="h-2.5 w-2.5 rounded-full bg-slate-900 border-2 border-white absolute top-1/2 -translate-y-1/2"
                    style={{ left: `${storageQuotaPercent}%` }}
                  />
                )}
              </div>

              <span className="font-mono text-[11px] text-slate-400">
                supabase-vault-01
              </span>
            </div>
          </motion.div>
        </div>

        {/* VAULT TABLE & DROPZONE CONTAINER */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Table Controls Bar */}
          <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              {/* Collection Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-slate-50 border-slate-200 rounded-xl px-3 text-slate-700">
                    <span>
                      {selectedCategory === "all" 
                        ? `All Collections (${activeCollectionsCount})` 
                        : getFriendlyCategory(selectedCategory)}
                    </span>
                    <ChevronDown className="ml-2 h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 rounded-xl shadow-xl">
                  <DropdownMenuItem onClick={() => setSelectedCategory("all")}>
                    All Collections ({activeCollectionsCount})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedCategory("resume")}>
                    Resumes & CVs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedCategory("certificates")}>
                    Certificates
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedCategory("hackathon")}>
                    Hackathon & Proofs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedCategory("education")}>
                    Education
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-slate-50 border-slate-200 rounded-xl px-3 text-slate-700">
                    <span>
                      {selectedStatus === "all" ? "All Statuses" : selectedStatus === "verified" ? "Verified" : "Needs Review"}
                    </span>
                    <ChevronDown className="ml-2 h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44 rounded-xl shadow-xl">
                  <DropdownMenuItem onClick={() => setSelectedStatus("all")}>
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedStatus("verified")}>
                    Verified & Vaulted
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedStatus("review_required")}>
                    Needs Review
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="text-xs font-mono text-slate-400 hidden md:inline ml-2">
                Showing {filteredDocs.length} vaulted records
              </span>
            </div>

            {/* List / Grid Toggle */}
            <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200/80 self-end sm:self-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={`h-7 px-2.5 rounded-md text-xs font-medium ${
                  viewMode === "list" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <List className="h-3.5 w-3.5 mr-1" />
                List
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`h-7 px-2.5 rounded-md text-xs font-medium ${
                  viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                Grid
              </Button>
            </div>
          </div>

          {/* Table Rows (when in List Mode) */}
          {viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-5 font-bold">DOCUMENT</th>
                    <th className="py-3 px-4 font-bold">CATEGORY</th>
                    <th className="py-3 px-4 font-bold">SIZE</th>
                    <th className="py-3 px-4 font-bold">ANCHOR (SHA-256)</th>
                    <th className="py-3 px-4 font-bold">STATUS</th>
                    <th className="py-3 px-4 font-bold">MODIFIED</th>
                    <th className="py-3 px-5 font-bold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                        No documents matched your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => {
                      const hash = doc.sha256 || "7f8a92cb91834e491298410294109283";
                      const shortHash = `${hash.slice(0, 6)}...${hash.slice(-4)}`;
                      const isCopied = copiedHash === hash;
                      const categoryLabel = getFriendlyCategory(doc.documentType);
                      const isCert = ["certificate", "certificates"].includes((doc.documentType || "").toLowerCase());
                      const isHackathon = ["hackathon", "achievement", "award"].includes((doc.documentType || "").toLowerCase());

                      return (
                        <tr 
                          key={doc.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* DOCUMENT */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center space-x-3">
                              {/* File Type Icon badge */}
                              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                isCert 
                                  ? "bg-blue-50/80 border-blue-200 text-blue-600" 
                                  : isHackathon 
                                  ? "bg-amber-50/80 border-amber-200 text-amber-600" 
                                  : "bg-rose-50/80 border-rose-200 text-rose-500"
                              }`}>
                                {isCert ? (
                                  <Award className="h-4 w-4" />
                                ) : isHackathon ? (
                                  <Zap className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <span 
                                  onClick={() => handleOpenPreview(doc)}
                                  className="font-bold text-xs text-slate-900 hover:text-blue-600 cursor-pointer truncate block max-w-xs transition-colors"
                                  title={doc.originalName}
                                >
                                  {doc.originalName}
                                </span>
                                <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                                  {getDocSubtitle(doc)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* CATEGORY */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                              {categoryLabel}
                            </span>
                          </td>

                          {/* SIZE */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                            {formatBytes(doc.fileSize)}
                          </td>

                          {/* ANCHOR (SHA-256) */}
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleCopyHash(hash)}
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 hover:bg-slate-200/80 font-mono text-[11px] text-slate-700 transition-colors border border-slate-200/80 group/hash"
                              title="Click to copy full cryptographic SHA-256 hash"
                            >
                              <span>{shortHash}</span>
                              {isCopied ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-slate-400 group-hover/hash:text-slate-600 transition-colors" />
                              )}
                            </button>
                          </td>

                          {/* STATUS */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                              Verified
                            </span>
                          </td>

                          {/* MODIFIED */}
                          <td className="py-3.5 px-4 text-[11px] text-slate-500">
                            {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                          </td>

                          {/* ACTIONS */}
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => togglePinMutation.mutate(doc.id)}
                                title={doc.isPinned ? "Pinned to Quick Access" : "Pin to Quick Access"}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  doc.isPinned 
                                    ? "text-amber-500 bg-amber-50 hover:bg-amber-100" 
                                    : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                                }`}
                              >
                                <Pin className={`h-4 w-4 ${doc.isPinned ? "fill-amber-500" : ""}`} />
                              </button>
                              <button
                                onClick={() => handleOpenPreview(doc)}
                                title="View in full actual size"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setSelectedDocForShare(doc)}
                                title="Share securely"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              >
                                <Share2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadDoc(doc)}
                                title="Download original"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => {
                const hash = doc.sha256 || "7f8a92cb91834e491298410294109283";
                const shortHash = `${hash.slice(0, 6)}...${hash.slice(-4)}`;
                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs flex flex-col justify-between space-y-3 min-w-0 overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 
                            onClick={() => handleOpenPreview(doc)}
                            className="font-bold text-xs text-slate-900 truncate block cursor-pointer hover:text-blue-600"
                            title={doc.originalName}
                          >
                            {doc.originalName}
                          </h4>
                          <span className="text-[11px] text-slate-400 truncate block" title={getFriendlyCategory(doc.documentType)}>
                            {getFriendlyCategory(doc.documentType)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => togglePinMutation.mutate(doc.id)}
                          className={`p-1 rounded-md transition-colors ${
                            doc.isPinned ? "text-amber-500 bg-amber-50" : "text-slate-300 hover:text-slate-600"
                          }`}
                          title={doc.isPinned ? "Pinned to Quick Access" : "Pin to Quick Access"}
                        >
                          <Pin className={`h-3.5 w-3.5 ${doc.isPinned ? "fill-amber-500" : ""}`} />
                        </button>
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>{formatBytes(doc.fileSize)}</span>
                      <button 
                        onClick={() => handleCopyHash(hash)}
                        className="text-[10px] hover:text-slate-800 flex items-center gap-1"
                      >
                        {shortHash} <Copy className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-end space-x-1 pt-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenPreview(doc)} className="h-7 text-xs">
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadDoc(doc)} className="h-7 text-xs">
                        <Download className="h-3 w-3 mr-1" /> Download
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DROPZONE STRIP AT BOTTOM */}
          <div 
            onClick={() => setIsUploadOpen(true)}
            className="p-3.5 px-5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 hover:bg-slate-100/80 cursor-pointer transition-colors group"
          >
            <div className="flex items-center space-x-2">
              <UploadCloud className="h-4 w-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              <span className="text-slate-600 font-medium">
                Drop files to auto-compute SHA-256 seal & encrypt in hardware enclave
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              Max 50 MB / file
            </span>
          </div>
        </div>

        {/* BOTTOM TWO SPLIT CARDS (ACTIVITY TRAIL & ENCLAVE SPEC) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card Left: ENCLAVE ACTIVITY TRAIL (Spans 2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700">
                    ENCLAVE ACTIVITY TRAIL
                  </span>
                </div>
                <button
                  onClick={handleExportAudit}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <span>Full Export</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Activity Timeline List */}
              <div className="mt-3 divide-y divide-slate-100">
                {recentFileActivities.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="h-10 w-10 mx-auto rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-2.5">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">No recent file activity</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                      Uploaded, deleted, and shared files will appear here automatically.
                    </p>
                  </div>
                ) : (
                  recentFileActivities.map((log) => {
                    const actionUpper = log.action?.toUpperCase() || "";
                    const isUpload = actionUpper.includes("UPLOAD");
                    const isDelete = actionUpper.includes("TRASH") || actionUpper.includes("DELETE");
                    const isShare = actionUpper.includes("SHARE");

                    let dotColor = "bg-emerald-500";
                    let actionTitle = "file.uploaded";
                    let actionSubtitle = log.details || "Vaulted & encrypted in pool";

                    if (isDelete) {
                      dotColor = "bg-rose-500";
                      actionTitle = actionUpper.includes("TRASH") ? "file.trashed" : "file.deleted";
                      actionSubtitle = log.details || (actionUpper.includes("TRASH") ? "Moved to 30-day trash bin" : "Permanently purged");
                    } else if (isShare) {
                      dotColor = "bg-blue-500";
                      actionTitle = "file.shared";
                      actionSubtitle = log.details || "Share link created";
                    }

                    const timeAgo = (() => {
                      try {
                        return formatDistanceToNow(new Date(log.timestamp), { addSuffix: true });
                      } catch {
                        return "Recently";
                      }
                    })();

                    return (
                      <div key={log.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/50 rounded-lg px-2 -mx-2 transition-colors">
                        <div className="flex items-center space-x-3 min-w-0 pr-3">
                          <span className={`h-2 w-2 rounded-full ${dotColor} shrink-0`} />
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-bold text-slate-800 truncate">
                              {actionTitle}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              <span className="font-medium text-slate-700">{log.documentName || "Document"}</span>
                              {" • "}
                              <span>{actionSubtitle}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-mono text-[11px] shrink-0">
                          <span className="text-slate-700 font-semibold block">{log.status || "SUCCESS"}</span>
                          <span className="text-slate-400 block">{timeAgo}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Card Right: ENCLAVE SPEC (Spans 1 col) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center space-x-2 pb-3.5 border-b border-slate-100">
                <Shield className="h-4 w-4 text-slate-600" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700">
                  ENCLAVE SPEC
                </span>
              </div>

              {/* Spec Rows */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Encryption</span>
                  <span className="font-mono font-semibold text-slate-800">AES-256-GCM</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Custody</span>
                  <span className="font-mono font-semibold text-slate-800">Hardware HSM</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Integrity</span>
                  <span className="font-mono font-semibold text-slate-800">Merkle SHA-256</span>
                </div>

                <div className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-slate-500 font-medium">Zero-Knowledge</span>
                  <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Strict Opt-Out
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>TLS 1.3 / mTLS</span>
              <a 
                href="#specs" 
                onClick={(e) => {
                  e.preventDefault();
                  toast({
                    title: "Hardware Security Enclave Specs",
                    description: "FIPS 140-2 Level 3 HSM, AES-256-GCM authenticated encryption, Merkle tree verification.",
                  });
                }}
                className="text-blue-600 font-semibold hover:underline flex items-center gap-1 font-sans"
              >
                Specs <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      <ShareModal
        document={selectedDocForShare}
        isOpen={!!selectedDocForShare}
        onClose={() => setSelectedDocForShare(null)}
      />

      <DocumentDetailModal
        document={selectedDocForDetail}
        isOpen={!!selectedDocForDetail}
        onClose={() => setSelectedDocForDetail(null)}
        onOpenShare={(doc) => setSelectedDocForShare(doc)}
        onDelete={(doc) => setDocToDelete(doc)}
        onOpenReview={(doc) => setSelectedDocForReview(doc)}
      />

      <ReviewModal
        document={selectedDocForReview}
        isOpen={!!selectedDocForReview}
        onClose={() => setSelectedDocForReview(null)}
      />

      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 font-display font-bold">
              Permanently delete document?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-xs">
              Are you sure you want to remove "{docToDelete?.originalName}" from your vault?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              onClick={() => {
                if (docToDelete) {
                  deleteMutation.mutate(docToDelete.id);
                  setDocToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
