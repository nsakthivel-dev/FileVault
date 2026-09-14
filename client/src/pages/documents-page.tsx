import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useDocuments } from "@/hooks/use-documents";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { UploadModal } from "@/components/documents/upload-modal";
import { DocumentDetailModal } from "@/components/documents/document-detail-modal";
import { ShareModal } from "@/components/documents/share-modal";
import { ReviewModal } from "@/components/documents/review-modal";
import { useDeleteDocument } from "@/hooks/use-documents";
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Plus, 
  Search, 
  ArrowLeft, 
  Award, 
  GraduationCap, 
  Briefcase, 
  Sparkles, 
  Zap, 
  BookOpen, 
  Shield, 
  FileCheck, 
  Download, 
  Share2, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  LayoutGrid, 
  List, 
  Clock, 
  HardDrive,
  ChevronRight,
  MoreVertical,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatDate } from "@/lib/format";
import { DocumentRecord } from "@shared/schema";
import { buildUrl, api } from "@shared/routes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

// Folder definitions matching storage hierarchy and AI document categories
export interface VaultFolderConfig {
  id: string;
  name: string;
  description: string;
  categoryKeys: string[];
  icon: any;
  color: string;
  bgLight: string;
  borderAccent: string;
}

export const VAULT_FOLDERS: VaultFolderConfig[] = [
  {
    id: "certificates",
    name: "Certificates & Licenses",
    description: "Professional credentials, courses, and verified skill certifications",
    categoryKeys: ["certificate", "certificates", "professional"],
    icon: Award,
    color: "#3b82f6",
    bgLight: "bg-blue-50/80 text-blue-700",
    borderAccent: "border-t-blue-500",
  },
  {
    id: "resumes",
    name: "Resumes & CVs",
    description: "Curriculum vitae, technical profiles, and career portfolios",
    categoryKeys: ["resume"],
    icon: FileText,
    color: "#ec4899",
    bgLight: "bg-pink-50/80 text-pink-700",
    borderAccent: "border-t-pink-500",
  },
  {
    id: "hackathons",
    name: "Hackathons & Competitions",
    description: "Project awards, hackathon winning proofs, and coding events",
    categoryKeys: ["hackathon", "participation"],
    icon: Zap,
    color: "#f59e0b",
    bgLight: "bg-amber-50/80 text-amber-700",
    borderAccent: "border-t-amber-500",
  },
  {
    id: "awards",
    name: "Awards & Honors",
    description: "Badges, excellence recognitions, and achievement records",
    categoryKeys: ["achievement", "award", "awards"],
    icon: Sparkles,
    color: "#10b981",
    bgLight: "bg-emerald-50/80 text-emerald-700",
    borderAccent: "border-t-emerald-500",
  },
  {
    id: "education",
    name: "Education & Degrees",
    description: "University diplomas, academic marksheets, and transcripts",
    categoryKeys: ["education", "degree", "marksheet"],
    icon: GraduationCap,
    color: "#6366f1",
    bgLight: "bg-indigo-50/80 text-indigo-700",
    borderAccent: "border-t-indigo-500",
  },
  {
    id: "experience",
    name: "Experience & Employment",
    description: "Employment offers, experience letters, payslips, and internships",
    categoryKeys: ["experience", "employment", "internship", "offer_letter", "experience_letter"],
    icon: Briefcase,
    color: "#8b5cf6",
    bgLight: "bg-purple-50/80 text-purple-700",
    borderAccent: "border-t-purple-500",
  },
  {
    id: "identity",
    name: "Identity & Government IDs",
    description: "Passports, national ID cards, driver licenses, and tax records",
    categoryKeys: ["identity", "government"],
    icon: Shield,
    color: "#0284c7",
    bgLight: "bg-sky-50/80 text-sky-700",
    borderAccent: "border-t-sky-500",
  },
  {
    id: "courses",
    name: "Courses & Training",
    description: "Bootcamps, workshops, tech seminars, and completed modules",
    categoryKeys: ["course", "workshop", "project"],
    icon: BookOpen,
    color: "#14b8a6",
    bgLight: "bg-teal-50/80 text-teal-700",
    borderAccent: "border-t-teal-500",
  },
  {
    id: "other",
    name: "General & Miscellaneous",
    description: "Unclassified documents, notes, and general files",
    categoryKeys: ["other"],
    icon: Folder,
    color: "#64748b",
    bgLight: "bg-slate-50/80 text-slate-700",
    borderAccent: "border-t-slate-400",
  },
];

export default function DocumentsPage() {
  const { user } = useAuth();
  const { data: documents, isLoading } = useDocuments();
  const deleteMutation = useDeleteDocument();

  const [location] = useLocation();
  // Extract folder from URL query param if present (e.g. /documents?folder=certificates)
  const initialFolder = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("folder");
    } catch {
      return null;
    }
  }, []);

  const [activeFolderId, setActiveFolderId] = useState<string | null>(initialFolder);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Modals state
  const [selectedDocForDetail, setSelectedDocForDetail] = useState<DocumentRecord | null>(null);
  const [selectedDocForShare, setSelectedDocForShare] = useState<DocumentRecord | null>(null);
  const [selectedDocForReview, setSelectedDocForReview] = useState<DocumentRecord | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentRecord | null>(null);

  const userFolderName = user?.name || user?.username?.split("@")[0] || "user";

  // Group documents into folders
  const folderStats = useMemo(() => {
    const map = new Map<string, { count: number; totalBytes: number; docs: DocumentRecord[] }>();

    VAULT_FOLDERS.forEach((f) => {
      map.set(f.id, { count: 0, totalBytes: 0, docs: [] });
    });

    (documents || []).forEach((doc) => {
      const docCat = (doc.documentType || "other").toLowerCase();
      // Find matching folder
      let matched = VAULT_FOLDERS.find((f) => f.categoryKeys.includes(docCat));
      if (!matched) {
        matched = VAULT_FOLDERS.find((f) => f.id === "other")!;
      }
      const entry = map.get(matched.id)!;
      entry.count += 1;
      entry.totalBytes += Number(doc.fileSize || 0);
      entry.docs.push(doc);
    });

    return map;
  }, [documents]);

  const activeFolder = useMemo(() => {
    if (!activeFolderId) return null;
    return VAULT_FOLDERS.find((f) => f.id === activeFolderId) || null;
  }, [activeFolderId]);

  // Documents inside active folder (with search filter)
  const activeFolderDocs = useMemo(() => {
    if (!activeFolder) return [];
    const entry = folderStats.get(activeFolder.id);
    const docs = entry ? entry.docs : [];

    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase().trim();
    return docs.filter((d) => 
      (d.originalName && d.originalName.toLowerCase().includes(q)) ||
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.organization && d.organization.toLowerCase().includes(q)) ||
      (d.skills && d.skills.some((s) => s.toLowerCase().includes(q))) ||
      (d.tags && d.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [activeFolder, folderStats, searchQuery]);

  const handleDownload = (doc: DocumentRecord) => {
    const url = buildUrl(api.documents.download.path, { id: doc.id });
    window.open(url, "_blank");
  };

  const handleOpenPreview = (doc: DocumentRecord) => {
    window.open(`/d/${doc.id}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
                Document Explorer
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                📁 Storage Folders
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Arranged folder structure for <span className="font-semibold text-slate-700 font-mono">users/{userFolderName}/documents/</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setIsUploadOpen(true)}
              className="rounded-xl font-semibold px-4 text-xs h-9 bg-slate-950 hover:bg-slate-800 text-white shadow-xs"
            >
              <Plus className="mr-1.5 h-4 w-4 text-white" />
              Upload to Vault
            </Button>
          </div>
        </div>

        {/* Breadcrumb Navigation Bar */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => {
                setActiveFolderId(null);
                setSearchQuery("");
              }}
              className={`flex items-center space-x-1.5 font-medium px-2 py-1 rounded-lg transition-colors ${
                !activeFolder 
                  ? "bg-slate-100 text-slate-900 font-semibold" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Layers className="h-4 w-4 text-slate-700" />
              <span>All Folders</span>
            </button>

            {activeFolder && (
              <>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <div className="flex items-center space-x-1.5 px-2 py-1 bg-amber-50 text-amber-900 font-semibold rounded-lg text-sm border border-amber-200/60">
                  <activeFolder.icon className="h-4 w-4" style={{ color: activeFolder.color }} />
                  <span>{activeFolder.name}</span>
                </div>
              </>
            )}
          </div>

          {/* Quick Search & View Toggle */}
          <div className="flex items-center space-x-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder={activeFolder ? `Search in ${activeFolder.name}...` : "Search across documents..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 rounded-lg"
              />
            </div>

            {activeFolder && (
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded ${viewMode === "grid" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded ${viewMode === "table" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
                  onClick={() => setViewMode("table")}
                  title="List View"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* VIEW 1: ALL FOLDERS GRID (Top-Level) */}
        {!activeFolder && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
                Classified Document Folders ({VAULT_FOLDERS.length})
              </h2>
              <span className="text-xs text-slate-400">
                {(documents || []).length} total files • Tap any folder to inspect
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {VAULT_FOLDERS.map((folder) => {
                const stats = folderStats.get(folder.id) || { count: 0, totalBytes: 0, docs: [] };
                const IconComponent = folder.icon;

                return (
                  <motion.div
                    key={folder.id}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => {
                      setActiveFolderId(folder.id);
                      setSearchQuery("");
                    }}
                    className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md cursor-pointer transition-all ${folder.borderAccent} border-t-4 flex flex-col justify-between active:scale-[0.99]`}
                  >
                    <div>
                      {/* Top icon and count */}
                      <div className="flex items-start justify-between">
                        <div 
                          className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-2xs"
                          style={{ backgroundColor: `${folder.color}15`, color: folder.color }}
                        >
                          <IconComponent className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <span className={`text-[11px] sm:text-xs font-bold px-2.5 py-0.5 sm:py-1 rounded-full ${folder.bgLight} border border-current/20`}>
                          {stats.count} {stats.count === 1 ? "file" : "files"}
                        </span>
                      </div>

                      {/* Folder Name & Description */}
                      <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 mt-3 group-hover:text-amber-600 transition-colors">
                        {folder.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {folder.description}
                      </p>
                    </div>

                    {/* Bottom Metadata & Path */}
                    <div className="mt-4 sm:mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[150px] sm:max-w-[170px]" title={`users/${userFolderName}/documents/${folder.id}/`}>
                        📁 .../{folder.id}/
                      </span>
                      <div className="flex items-center space-x-1 text-slate-600 font-semibold text-xs">
                        <span>{formatBytes(stats.totalBytes)}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: INSIDE SELECTED FOLDER */}
        {activeFolder && (
          <div className="space-y-4">
            {/* Folder Header Banner */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                <div 
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shadow-xs shrink-0"
                  style={{ backgroundColor: `${activeFolder.color}15`, color: activeFolder.color }}
                >
                  <activeFolder.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h2 className="text-lg sm:text-xl font-display font-bold text-slate-900 truncate">
                      {activeFolder.name}
                    </h2>
                    <span className={`text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${activeFolder.bgLight} shrink-0`}>
                      {activeFolderDocs.length} {activeFolderDocs.length === 1 ? "file" : "files"}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                    Storage: <span className="font-mono font-medium text-slate-600 truncate">.../documents/{activeFolder.id}/</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveFolderId(null);
                    setSearchQuery("");
                  }}
                  className="flex-1 sm:flex-none text-xs font-medium border-slate-300 hover:bg-slate-100 h-8 rounded-xl"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsUploadOpen(true)}
                  className="flex-1 sm:flex-none text-xs font-semibold shadow-xs rounded-xl h-8 px-3 bg-slate-950 hover:bg-slate-800 text-white"
                >
                  <Plus className="mr-1 h-3.5 w-3.5 text-white" /> Add File
                </Button>
              </div>
            </div>

            {/* Empty Folder State */}
            {activeFolderDocs.length === 0 && (
              <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center">
                <div 
                  className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${activeFolder.color}15`, color: activeFolder.color }}
                >
                  <FolderOpen className="h-8 w-8" />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-800">
                  This Folder is Empty
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6 leading-relaxed">
                  {searchQuery 
                    ? `No documents matched "${searchQuery}" in this folder.`
                    : `No files currently organized under ${activeFolder.name}. Upload new career files or let AI auto-classify them.`}
                </p>
                <Button
                  onClick={() => setIsUploadOpen(true)}
                  className="font-semibold px-4 text-xs h-9 rounded-xl shadow-xs bg-slate-950 hover:bg-slate-800 text-white"
                >
                  <Plus className="mr-1.5 h-4 w-4 text-white" /> Upload Document
                </Button>
              </div>
            )}

            {/* GRID VIEW OF DOCUMENTS IN FOLDER */}
            {activeFolderDocs.length > 0 && viewMode === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeFolderDocs.map((doc) => {
                  const isPdf = doc.mimeType === "application/pdf";
                  const isImage = doc.mimeType.startsWith("image/");
                  const isReviewRequired = doc.processingStatus === "review_required";
                  const isDuplicate = doc.duplicateStatus === "exact_duplicate" || doc.duplicateStatus === "possible_duplicate";

                  return (
                    <motion.div
                      key={doc.id}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.15 }}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md flex flex-col justify-between relative group min-w-0 overflow-hidden"
                    >
                      <div className="min-w-0 w-full">
                        {/* Card Header: Icon + Status */}
                        <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 border border-slate-200/80">
                              {isPdf ? (
                                <FileText className="h-5 w-5 text-rose-500" />
                              ) : isImage ? (
                                <FileCheck className="h-5 w-5 text-blue-500" />
                              ) : (
                                <FileText className="h-5 w-5 text-slate-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 
                                className="font-bold text-sm text-slate-900 truncate block hover:text-blue-600 cursor-pointer transition-colors" 
                                title={doc.title || doc.originalName}
                                onClick={() => handleOpenPreview(doc)}
                              >
                                {doc.title || doc.originalName}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate block" title={doc.originalName}>
                                {doc.originalName}
                              </p>
                            </div>
                          </div>

                          {/* Quick Dropdown Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl">
                              <DropdownMenuItem onClick={() => handleOpenPreview(doc)}>
                                <Eye className="mr-2 h-4 w-4 text-slate-500" /> View Full Size
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                <Download className="mr-2 h-4 w-4 text-slate-500" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedDocForShare(doc)}>
                                <Share2 className="mr-2 h-4 w-4 text-slate-500" /> Share Securely
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedDocForDetail(doc)}>
                                <Clock className="mr-2 h-4 w-4 text-slate-500" /> Metadata & AI
                              </DropdownMenuItem>
                              {isReviewRequired && (
                                <DropdownMenuItem onClick={() => setSelectedDocForReview(doc)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-amber-600" /> Review AI Extraction
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDocToDelete(doc)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Document
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                          {doc.aiProcessed ? (
                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Vaulted ({((doc.confidence || 0) * 100).toFixed(0)}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Processing
                            </span>
                          )}

                          {isReviewRequired && (
                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertCircle className="w-3 h-3 mr-1 text-amber-600" /> Needs Review
                            </span>
                          )}

                          {isDuplicate && (
                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                              Duplicate
                            </span>
                          )}
                        </div>

                        {/* Tags and Skills */}
                        {((doc.skills && doc.skills.length > 0) || (doc.tags && doc.tags.length > 0)) && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {(doc.tags || []).slice(0, 3).map((t, idx) => (
                              <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                #{t}
                              </span>
                            ))}
                            {(doc.skills || []).slice(0, 2).map((s, idx) => (
                              <span key={idx} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Metadata + Primary View Action */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <div>
                          <span>{formatBytes(doc.fileSize)}</span>
                          <span className="mx-1.5">•</span>
                          <span>{formatDate(doc.uploadedAt)}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPreview(doc)}
                            className="h-7 px-2 text-xs font-semibold text-slate-700 hover:text-black hover:bg-slate-100 rounded-lg"
                            title="Open in Document Viewer"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5 text-slate-500" /> View
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* TABLE / LIST VIEW OF DOCUMENTS IN FOLDER */}
            {activeFolderDocs.length > 0 && viewMode === "table" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Document</th>
                        <th className="py-3 px-4">Classification</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Uploaded</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {activeFolderDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <span 
                                  onClick={() => handleOpenPreview(doc)}
                                  className="font-semibold text-slate-900 hover:text-blue-600 cursor-pointer truncate block max-w-xs transition-colors"
                                >
                                  {doc.title || doc.originalName}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                                  {doc.originalName}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] capitalize bg-slate-50">
                              {doc.documentType || "other"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {doc.aiProcessed ? (
                              <span className="text-[11px] text-emerald-700 font-semibold flex items-center">
                                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Vaulted
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Processing</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {formatBytes(doc.fileSize)}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {formatDate(doc.uploadedAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenPreview(doc)}
                                className="h-7 px-2 text-xs font-semibold"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" /> View
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(doc)}
                                className="h-7 w-7 text-slate-500"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedDocForShare(doc)}
                                className="h-7 w-7 text-slate-500"
                                title="Share"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
      />

      <DocumentDetailModal
        document={selectedDocForDetail}
        isOpen={!!selectedDocForDetail}
        onClose={() => setSelectedDocForDetail(null)}
        onOpenShare={(doc) => setSelectedDocForShare(doc)}
        onDelete={(doc) => setDocToDelete(doc)}
        onOpenReview={(doc) => setSelectedDocForReview(doc)}
      />

      <ShareModal
        document={selectedDocForShare}
        isOpen={!!selectedDocForShare}
        onClose={() => setSelectedDocForShare(null)}
      />

      <ReviewModal
        document={selectedDocForReview}
        isOpen={!!selectedDocForReview}
        onClose={() => setSelectedDocForReview(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 font-display font-bold">
              Permanently delete document?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-xs">
              Are you sure you want to remove <span className="font-semibold text-slate-700 font-mono">"{docToDelete?.originalName}"</span> from your vault? This will also remove it from Cloud Storage.
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
