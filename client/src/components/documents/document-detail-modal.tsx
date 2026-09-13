import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentRecord, DocumentCategories } from "@shared/schema";
import { formatBytes } from "@/lib/format";
import { useUpdateDocument, useReprocessDocument } from "@/hooks/use-documents";
import { buildUrl, api } from "@shared/routes";
import { 
  FileText, 
  Download, 
  Eye, 
  Share2, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Calendar, 
  Sparkles, 
  AlertCircle,
  Clock,
  Building2,
  Award,
  Tag,
  RefreshCw,
  Copy,
  Plus
} from "lucide-react";
import { format } from "date-fns";

interface DocumentDetailModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenShare: (doc: DocumentRecord) => void;
  onDelete: (doc: DocumentRecord) => void;
  onOpenReview?: (doc: DocumentRecord) => void;
}

export function DocumentDetailModal({
  document,
  isOpen,
  onClose,
  onOpenShare,
  onDelete,
  onOpenReview,
}: DocumentDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<DocumentRecord>>({});
  const [newTagInput, setNewTagInput] = useState("");
  
  const updateMutation = useUpdateDocument();
  const reprocessMutation = useReprocessDocument();

  if (!document) return null;

  const handleStartEdit = () => {
    setEditForm({
      originalName: document.originalName,
      title: document.title || document.originalName,
      documentType: document.documentType,
      subType: document.subType || "",
      personName: document.personName || document.recipientName || "",
      recipientName: document.recipientName || document.personName || "",
      organization: document.organization || document.institution || "",
      institution: document.institution || document.organization || "",
      certificateNumber: document.certificateNumber || "",
      achievement: document.achievement || "",
      rank: document.rank || "",
      issueDate: document.issueDate || "",
      expiryDate: document.expiryDate || "",
      description: document.description || "",
      tags: [...(document.tags || [])],
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate(
      {
        id: document.id,
        updates: editForm,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const currentTags = editForm.tags || document.tags || [];
    const updatedTags = Array.from(new Set([...currentTags, newTagInput.trim()]));
    
    if (isEditing) {
      setEditForm({ ...editForm, tags: updatedTags });
    } else {
      updateMutation.mutate({
        id: document.id,
        updates: { tags: updatedTags },
      });
    }
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = isEditing ? editForm.tags || [] : document.tags || [];
    const updatedTags = currentTags.filter((t) => t !== tagToRemove);
    
    if (isEditing) {
      setEditForm({ ...editForm, tags: updatedTags });
    } else {
      updateMutation.mutate({
        id: document.id,
        updates: { tags: updatedTags },
      });
    }
  };

  const handleReprocess = () => {
    reprocessMutation.mutate(document.id);
  };

  const handleDownload = () => {
    const url = buildUrl(api.documents.download.path, { id: document.id });
    window.open(url, "_blank");
  };

  const handlePreview = () => {
    window.open(`/d/${document.id}`, "_blank");
  };

  // Expiry calculation
  const now = new Date();
  const expiry = document.expiryDate ? new Date(document.expiryDate) : null;
  const isExpired = expiry ? expiry < now : false;
  const daysUntilExpiry = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const getStatusBadge = () => {
    if (document.processingStatus === "review_required") {
      return { label: "Needs Review", bg: "bg-amber-50 text-amber-800 border-amber-300" };
    }
    if (document.processingStatus === "processing") {
      return { label: "Analyzing...", bg: "bg-blue-50 text-blue-800 border-blue-200 animate-pulse" };
    }
    if (document.duplicateStatus === "exact_duplicate" || document.duplicateStatus === "possible_duplicate") {
      return { label: "Duplicate", bg: "bg-purple-50 text-purple-800 border-purple-200" };
    }
    if (document.verificationStatus === "Verified") {
      return { label: "Verified", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    }
    return { label: "Vaulted", bg: "bg-slate-100 text-slate-800 border-slate-200" };
  };

  const statusBadge = getStatusBadge();
  const confidencePercent = Math.round((document.confidence || 0) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl border-0 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 bg-white overflow-y-auto flex-1">
          {/* Header */}
          <DialogHeader className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}>
                  {statusBadge.label}
                </span>
                {confidencePercent > 0 && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    AI Confidence: {confidencePercent}%
                  </span>
                )}
                {document.duplicateStatus && document.duplicateStatus !== "unique" && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center">
                    <Copy className="w-3 h-3 mr-1" />
                    {document.duplicateStatus === "exact_duplicate" ? "Exact Duplicate" : "Possible Duplicate"}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {document.id.slice(0, 8)}...
              </span>
            </div>
            <DialogTitle className="text-xl font-display font-bold text-slate-900 mt-2 truncate">
              {document.title || document.originalName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {document.originalName} • Uploaded on {format(new Date(document.uploadedAt), "MMM d, yyyy")} • {formatBytes(document.fileSize)}
            </DialogDescription>
          </DialogHeader>

          {/* Needs Review or Duplicate Alert Banner */}
          {(document.processingStatus === "review_required" || document.duplicateStatus === "possible_duplicate") && onOpenReview && (
            <div className="p-3.5 rounded-xl mb-4 bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-amber-900">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>This document requires your review to finalize classification and metadata.</span>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenReview(document);
                }}
                className="text-xs h-7 bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                Review Now
              </Button>
            </div>
          )}

          {/* Expiry Alert if applicable */}
          {expiry && (
            <div
              className={`p-3 rounded-xl mb-4 border flex items-center space-x-2 text-xs ${
                isExpired
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : daysUntilExpiry !== null && daysUntilExpiry <= 30
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              {isExpired ? (
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
              )}
              <span>
                {isExpired
                  ? `This document expired on ${format(expiry, "MMM d, yyyy")}.`
                  : `Expires in ${daysUntilExpiry} days (${format(expiry, "MMM d, yyyy")}).`}
              </span>
            </div>
          )}

          {/* Body Content: Edit or View */}
          {isEditing ? (
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-[11px] font-semibold text-slate-700 uppercase">Document Title</Label>
                <Input
                  value={editForm.title || ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="h-8 text-xs rounded-lg mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 uppercase">Category</Label>
                  <Select
                    value={editForm.documentType || document.documentType}
                    onValueChange={(val: any) => setEditForm({ ...editForm, documentType: val })}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-lg mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60">
                      {DocumentCategories.filter((c, i, a) => a.indexOf(c) === i).map((c) => (
                        <SelectItem key={c} value={c} className="text-xs capitalize">
                          {c.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 uppercase">Sub-Type</Label>
                  <Input
                    value={editForm.subType || ""}
                    placeholder="e.g. hackathon, technical"
                    onChange={(e) => setEditForm({ ...editForm, subType: e.target.value })}
                    className="h-8 text-xs rounded-lg mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 uppercase">Person / Holder Name</Label>
                  <Input
                    value={editForm.personName || ""}
                    onChange={(e) => setEditForm({ ...editForm, personName: e.target.value, recipientName: e.target.value })}
                    className="h-8 text-xs rounded-lg mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 uppercase">Institution / Authority</Label>
                  <Input
                    value={editForm.organization || ""}
                    onChange={(e) => setEditForm({ ...editForm, organization: e.target.value, institution: e.target.value })}
                    className="h-8 text-xs rounded-lg mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 uppercase">Achievement</Label>
                  <Input
                    value={editForm.achievement || ""}
                    placeholder="e.g. Winner / 1st Place"
                    onChange={(e) => setEditForm({ ...editForm, achievement: e.target.value })}
                    className="h-8 text-xs rounded-lg mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 uppercase">Rank / Prize</Label>
                  <Input
                    value={editForm.rank || ""}
                    placeholder="e.g. 3rd Prize"
                    onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })}
                    className="h-8 text-xs rounded-lg mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 uppercase">Issue Date</Label>
                  <Input
                    type="date"
                    value={editForm.issueDate || ""}
                    onChange={(e) => setEditForm({ ...editForm, issueDate: e.target.value })}
                    className="h-8 text-xs rounded-lg mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 uppercase">Expiry Date</Label>
                  <Input
                    type="date"
                    value={editForm.expiryDate || ""}
                    onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                    className="h-8 text-xs rounded-lg mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-700 uppercase">Notes / Description</Label>
                <Textarea
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="text-xs rounded-lg mt-1 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                  className="h-8 text-xs font-semibold"
                  style={{ backgroundColor: "#c9a84c", color: "#1a2332" }}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-1 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                  <span className="text-sm font-semibold text-slate-800 capitalize">
                    {document.documentType} {document.subType ? `(${document.subType})` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">File Format</span>
                  <span className="text-sm font-semibold text-slate-800 uppercase">
                    {document.mimeType?.split("/")[1] || "PDF"}
                  </span>
                </div>
                {(document.personName || document.recipientName) && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Participant / Holder</span>
                    <span className="text-sm font-medium text-slate-800">
                      {document.personName || document.recipientName}
                    </span>
                  </div>
                )}
                {(document.organization || document.institution) && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Issuing Authority</span>
                    <span className="text-sm font-medium text-slate-800">
                      {document.organization || document.institution}
                    </span>
                  </div>
                )}
                {(document.achievement || document.rank) && (
                  <div className="col-span-2 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Achievement / Award</span>
                    <span className="text-sm font-bold text-amber-900 flex items-center">
                      <Award className="h-4 w-4 mr-1 text-[#c9a84c]" />
                      {document.rank ? `${document.rank} — ` : ""}{document.achievement || "Verified Achievement"}
                    </span>
                  </div>
                )}
                {document.issueDate && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Issue Date</span>
                    <span className="text-sm font-medium text-slate-800">
                      {format(new Date(document.issueDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {document.expiryDate && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expiry Date</span>
                    <span className="text-sm font-medium text-slate-800">
                      {format(new Date(document.expiryDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </div>

              {/* Skills Tags */}
              {document.skills && document.skills.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Extracted Skills & Competencies
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {document.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Section with add/remove */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tags & Classification
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {(document.tags || []).map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium flex items-center space-x-1"
                    >
                      <Tag className="w-2.5 h-2.5 mr-0.5 text-slate-400" />
                      <span>{t}</span>
                      <button
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-red-600 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="inline-flex items-center space-x-1">
                    <Input
                      placeholder="+ tag"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      className="h-6 w-20 text-[11px] rounded-md px-1.5"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleAddTag}
                      className="h-6 w-6 p-0 rounded-md"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {document.description && (
                <div className="px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Remarks</span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    {document.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                className="h-8 text-xs font-medium rounded-lg text-slate-700 border-slate-200"
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-8 text-xs font-medium rounded-lg text-slate-700 border-slate-200"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReprocess}
                disabled={reprocessMutation.isPending}
                className="h-8 text-xs font-medium rounded-lg text-slate-700 border-slate-200"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${reprocessMutation.isPending ? "animate-spin" : ""}`} />
                Reprocess
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenShare(document);
                }}
                className="h-8 text-xs font-medium rounded-lg text-[#c9a84c] border-amber-200 bg-amber-50/30 hover:bg-amber-50"
              >
                <Share2 className="h-3.5 w-3.5 mr-1" />
                Share
              </Button>
            </div>

            <div className="flex items-center space-x-1">
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEdit}
                  className="h-8 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900"
                >
                  <Edit3 className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                  onDelete(document);
                }}
                className="h-8 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
