import { useState } from "react";
import { Link } from "wouter";
import { 
  MoreVertical, 
  Eye, 
  Download, 
  Trash2, 
  FileText, 
  Search, 
  File,
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Filter, 
  Info,
  Sparkles,
  Loader2,
  Copy,
  Tag,
  Award,
  Check
} from "lucide-react";
import { DocumentRecord, DocumentCategories } from "@shared/schema";
import { formatBytes } from "@/lib/format";
import { buildUrl, api } from "@shared/routes";
import { useDeleteDocument, useDocumentTags } from "@/hooks/use-documents";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentDetailModal } from "./document-detail-modal";
import { ShareModal } from "./share-modal";
import { ReviewModal } from "./review-modal";
import { format } from "date-fns";

interface DocumentTableProps {
  documents?: DocumentRecord[];
  isLoading: boolean;
}

function getFileTypeInfo(mimeType: string, fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (mimeType.includes("pdf") || ext === "pdf") {
    return { label: "PDF Document", color: "#ef4444", bgColor: "#fef2f2", Icon: FileText };
  }
  if (mimeType.includes("image") || ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
    return { label: "Image", color: "#8b5cf6", bgColor: "#f5f3ff", Icon: File };
  }
  return { label: "Document", color: "#6b7280", bgColor: "#f9fafb", Icon: FileText };
}

function formatTableDate(date: string | null | undefined) {
  if (!date) return "N/A";
  return format(new Date(date), "MMM dd, yyyy");
}

export function DocumentTable({ documents, isLoading }: DocumentTableProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");

  const [detailDoc, setDetailDoc] = useState<DocumentRecord | null>(null);
  const [reviewDoc, setReviewDoc] = useState<DocumentRecord | null>(null);
  const [shareDoc, setShareDoc] = useState<DocumentRecord | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentRecord | null>(null);

  const { data: availableTags } = useDocumentTags();
  const deleteMutation = useDeleteDocument();

  // Filter documents
  const filteredDocs = (documents || []).filter((doc) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      doc.originalName.toLowerCase().includes(q) ||
      (doc.title && doc.title.toLowerCase().includes(q)) ||
      (doc.institution && doc.institution.toLowerCase().includes(q)) ||
      (doc.organization && doc.organization.toLowerCase().includes(q)) ||
      (doc.certificateNumber && doc.certificateNumber.toLowerCase().includes(q)) ||
      (doc.recipientName && doc.recipientName.toLowerCase().includes(q)) ||
      (doc.personName && doc.personName.toLowerCase().includes(q)) ||
      (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(q))) ||
      (doc.skills && doc.skills.some((s) => s.toLowerCase().includes(q)));

    const matchesCategory =
      selectedCategory === "all" ||
      doc.documentType?.toLowerCase() === selectedCategory.toLowerCase() ||
      doc.subType?.toLowerCase() === selectedCategory.toLowerCase();

    const matchesTag =
      selectedTag === "all" ||
      (doc.tags && doc.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()));

    const now = new Date();
    const expiry = doc.expiryDate ? new Date(doc.expiryDate) : null;
    const isExpired = expiry ? expiry < now : false;
    const isExpiringSoon = expiry ? !isExpired && (expiry.getTime() - now.getTime()) <= 30 * 24 * 60 * 60 * 1000 : false;

    let matchesStatus = true;
    if (selectedStatus === "Needs Review") matchesStatus = doc.processingStatus === "review_required";
    else if (selectedStatus === "Processing") matchesStatus = doc.processingStatus === "processing" || doc.processingStatus === "uploaded";
    else if (selectedStatus === "Duplicate") matchesStatus = doc.duplicateStatus === "exact_duplicate" || doc.duplicateStatus === "possible_duplicate";
    else if (selectedStatus === "Completed") matchesStatus = doc.processingStatus === "completed";
    else if (selectedStatus === "Verified") matchesStatus = doc.verificationStatus === "Verified";
    else if (selectedStatus === "Unverified") matchesStatus = doc.verificationStatus === "Unverified";
    else if (selectedStatus === "Expired") matchesStatus = isExpired || doc.verificationStatus === "Expired";
    else if (selectedStatus === "Expiring Soon") matchesStatus = isExpiringSoon;

    return matchesSearch && matchesCategory && matchesStatus && matchesTag;
  });

  const handleDownload = (doc: DocumentRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildUrl(api.documents.download.path, { id: doc.id });
    window.open(url, "_blank");
  };

  const confirmDelete = () => {
    if (docToDelete) {
      deleteMutation.mutate(docToDelete.id, {
        onSuccess: () => setDocToDelete(null),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-10 w-56 rounded-lg" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center px-6 py-4 border-b border-slate-100">
              <Skeleton className="h-9 w-9 rounded-lg mr-4" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-4 w-20 mr-8" />
              <Skeleton className="h-4 w-16 mr-8" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const uniqueCategories = Array.from(new Set(DocumentCategories));

  return (
    <div className="space-y-5">
      {/* Search & Category Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900 flex items-center">
            Vault Documents
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {filteredDocs.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Intelligent career documents organized by category, skills, and AI analysis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by title, skill, org..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 rounded-lg bg-white border-slate-200 text-xs focus-visible:ring-amber-400"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400 capitalize"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            <option value="all">All Statuses</option>
            <option value="Needs Review">Needs Review ⚠️</option>
            <option value="Completed">Completed ✓</option>
            <option value="Processing">Processing ⏳</option>
            <option value="Duplicate">Duplicates 🔁</option>
            <option value="Verified">Verified</option>
            <option value="Expiring Soon">Expiring Soon (&lt;30d)</option>
            <option value="Expired">Expired</option>
          </select>

          {/* Tag Filter (if tags exist) */}
          {availableTags && availableTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <option value="all">All Tags</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="h-16 w-16 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-base font-display font-semibold text-slate-900 mb-1">No documents found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {search || selectedCategory !== "all" || selectedStatus !== "all" || selectedTag !== "all"
                ? "No files matching your filter criteria. Try resetting filters."
                : "Your vault is empty. Upload your first certificate, hackathon award, or resume to begin."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-[0.1em] text-slate-500">Document</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-[0.1em] text-slate-500">Classification</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-[0.1em] text-slate-500">AI Status</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-[0.1em] text-slate-500">Tags & Skills</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-[0.1em] text-slate-500">Date</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-[0.1em] text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => {
                  const fileType = getFileTypeInfo(doc.mimeType, doc.originalName);
                  const isNeedsReview = doc.processingStatus === "review_required";
                  const isProcessing = doc.processingStatus === "processing" || doc.processingStatus === "uploaded";
                  const isDuplicate = doc.duplicateStatus === "exact_duplicate" || doc.duplicateStatus === "possible_duplicate";
                  const confidenceScore = Math.round((doc.confidence || 0) * 100);

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setDetailDoc(doc)}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    >
                      {/* Name & Icon */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div
                            className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: fileType.bgColor }}
                          >
                            <fileType.Icon className="h-[18px] w-[18px]" style={{ color: fileType.color }} />
                          </div>
                          <div className="min-w-0 max-w-[260px]">
                            <span className="font-semibold text-sm text-slate-900 group-hover:text-amber-700 transition-colors truncate block">
                              {doc.title || doc.originalName}
                            </span>
                            <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-0.5 truncate">
                              {(doc.organization || doc.institution) && (
                                <span className="truncate">{doc.organization || doc.institution}</span>
                              )}
                              {(doc.organization || doc.institution) && <span>•</span>}
                              <span>{formatBytes(doc.fileSize)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Subtype */}
                      <td className="px-4 py-3.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold capitalize text-[11px]">
                            {doc.documentType?.replace("_", " ")}
                          </span>
                          {doc.subType && (
                            <span className="text-[10px] text-slate-500 capitalize px-1">
                              {doc.subType}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* AI & Processing Status */}
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap" onClick={(e) => {
                        if (isNeedsReview || isDuplicate) {
                          e.stopPropagation();
                          setReviewDoc(doc);
                        }
                      }}>
                        <div className="flex flex-col items-start gap-1">
                          {isProcessing ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin text-blue-500" />
                              Analyzing...
                            </span>
                          ) : isNeedsReview ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReviewDoc(doc);
                              }}
                              className="inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
                            >
                              <AlertCircle className="h-3 w-3 mr-1 text-amber-600" />
                              Needs Review
                            </button>
                          ) : isDuplicate ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReviewDoc(doc);
                              }}
                              className="inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition-colors"
                            >
                              <Copy className="h-3 w-3 mr-1 text-purple-600" />
                              Duplicate
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
                              Vaulted
                            </span>
                          )}

                          {confidenceScore > 0 && !isProcessing && (
                            <span className="text-[10px] text-slate-400 font-mono px-1">
                              {confidenceScore}% confidence
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tags & Skills Preview */}
                      <td className="px-4 py-3.5 text-xs max-w-[200px]">
                        <div className="flex flex-wrap gap-1 items-center">
                          {(doc.tags || []).slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium truncate max-w-[90px]"
                            >
                              #{t}
                            </span>
                          ))}
                          {(doc.skills || []).slice(0, 2).map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium truncate max-w-[90px]"
                            >
                              {s}
                            </span>
                          ))}
                          {(doc.tags?.length || 0) + (doc.skills?.length || 0) > 5 && (
                            <span className="text-[10px] text-slate-400">
                              +{((doc.tags?.length || 0) + (doc.skills?.length || 0)) - 5}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap text-slate-600">
                        {doc.issueDate ? formatTableDate(doc.issueDate) : formatTableDate(doc.uploadedAt)}
                      </td>

                      {/* Action Menu */}
                      <td className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1">
                          {(isNeedsReview || isDuplicate) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReviewDoc(doc)}
                              className="h-7 px-2 text-[11px] font-semibold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 mr-1"
                            >
                              Review
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShareDoc(doc)}
                            className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                            title="Share Document"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 rounded-lg"
                              >
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-xl border-slate-100">
                              <DropdownMenuItem
                                onClick={() => setDetailDoc(doc)}
                                className="cursor-pointer rounded-lg px-3 py-2 text-xs"
                              >
                                <Info className="mr-2 h-4 w-4 text-slate-500" />
                                <span className="font-medium">Details & Extraction</span>
                              </DropdownMenuItem>
                              {(isNeedsReview || isDuplicate) && (
                                <DropdownMenuItem
                                  onClick={() => setReviewDoc(doc)}
                                  className="cursor-pointer rounded-lg px-3 py-2 text-xs text-amber-800"
                                >
                                  <AlertCircle className="mr-2 h-4 w-4 text-amber-600" />
                                  <span className="font-medium">Human Review</span>
                                </DropdownMenuItem>
                              )}
                              <Link href={`/d/${doc.id}`}>
                                <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2 text-xs">
                                  <Eye className="mr-2 h-4 w-4 text-slate-500" />
                                  <span className="font-medium">Preview Original</span>
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem
                                onClick={(e) => handleDownload(doc, e)}
                                className="cursor-pointer rounded-lg px-3 py-2 text-xs"
                              >
                                <Download className="mr-2 h-4 w-4 text-slate-500" />
                                <span className="font-medium">Download</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setShareDoc(doc)}
                                className="cursor-pointer rounded-lg px-3 py-2 text-xs text-amber-700"
                              >
                                <Share2 className="mr-2 h-4 w-4 text-amber-600" />
                                <span className="font-medium">Share Access</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem
                                onClick={() => setDocToDelete(doc)}
                                className="cursor-pointer rounded-lg px-3 py-2 text-xs text-red-600 focus:text-red-700 focus:bg-red-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span className="font-medium">Delete File</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Detail Modal */}
      <DocumentDetailModal
        document={detailDoc}
        isOpen={!!detailDoc}
        onClose={() => setDetailDoc(null)}
        onOpenShare={(doc) => setShareDoc(doc)}
        onDelete={(doc) => setDocToDelete(doc)}
        onOpenReview={(doc) => setReviewDoc(doc)}
      />

      {/* Human Review Modal */}
      <ReviewModal
        document={reviewDoc}
        isOpen={!!reviewDoc}
        onClose={() => setReviewDoc(null)}
      />

      {/* Share Modal */}
      <ShareModal
        document={shareDoc}
        isOpen={!!shareDoc}
        onClose={() => setShareDoc(null)}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">Delete Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-500">
              This will permanently purge <span className="font-semibold text-slate-900">"{docToDelete?.originalName}"</span> from your vault and revoke all active share links. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-xl font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700 rounded-xl font-semibold shadow-md shadow-red-600/20"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
