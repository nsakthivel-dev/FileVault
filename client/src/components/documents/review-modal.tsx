import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentRecord, DocumentCategories } from "@shared/schema";
import { useReviewDocument, useResolveDuplicate, useReprocessDocument } from "@/hooks/use-documents";
import { buildUrl, api } from "@shared/routes";
import { 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  Eye, 
  Edit3, 
  RefreshCw, 
  Copy, 
  HelpCircle,
  Tag,
  Award
} from "lucide-react";

interface ReviewModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewModal({ document, isOpen, onClose }: ReviewModalProps) {
  const [docType, setDocType] = useState<string>("other");
  const [subType, setSubType] = useState("");
  const [title, setTitle] = useState("");
  const [personName, setPersonName] = useState("");
  const [organization, setOrganization] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [achievement, setAchievement] = useState("");
  const [rank, setRank] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const reviewMutation = useReviewDocument();
  const duplicateMutation = useResolveDuplicate();
  const reprocessMutation = useReprocessDocument();

  useEffect(() => {
    if (document) {
      setDocType(document.documentType || "other");
      setSubType(document.subType || "");
      setTitle(document.title || document.originalName || "");
      setPersonName(document.personName || document.recipientName || "");
      setOrganization(document.organization || document.institution || "");
      setIssueDate(document.issueDate || "");
      setExpiryDate(document.expiryDate || "");
      setAchievement(document.achievement || "");
      setRank(document.rank || "");
      setNotes(document.description || "");
      setTagsInput((document.tags || []).join(", "));
    }
  }, [document]);

  if (!document) return null;

  const isDuplicate = document.duplicateStatus === "exact_duplicate" || document.duplicateStatus === "possible_duplicate";
  const confidencePercent = Math.round((document.confidence || 0) * 100);

  const handleAccept = () => {
    reviewMutation.mutate(
      {
        id: document.id,
        action: "accept",
        updates: {
          documentType: docType as any,
          subType: subType || null,
          title: title || document.originalName,
          personName: personName || null,
          recipientName: personName || null,
          organization: organization || null,
          institution: organization || null,
          issueDate: issueDate || null,
          expiryDate: expiryDate || null,
          achievement: achievement || null,
          rank: rank || null,
          description: notes || null,
          tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        },
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  const handleKeepBoth = () => {
    duplicateMutation.mutate(
      {
        id: document.id,
        action: "keep",
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  const handleReprocess = () => {
    reprocessMutation.mutate(document.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl border-0 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 bg-white overflow-y-auto flex-1">
          <DialogHeader className="mb-4">
            <div className="flex items-center space-x-2 mb-1">
              {isDuplicate ? (
                <div className="flex items-center space-x-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 text-xs font-bold uppercase">
                  <Copy className="h-3.5 w-3.5" />
                  <span>Duplicate Detected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 text-xs font-bold uppercase">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Human Review Required</span>
                </div>
              )}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Confidence: {confidencePercent}%
              </span>
            </div>
            <DialogTitle className="text-xl font-display font-bold text-slate-900 truncate mt-1">
              Review: {document.originalName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Verify and calibrate the AI document classification. You can accept, adjust details, or reclassify below.
            </DialogDescription>
          </DialogHeader>

          {/* Uncertain Fields Banner */}
          {document.uncertainFields && document.uncertainFields.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
              <HelpCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Uncertain or Ambiguous Fields: </span>
                <span className="font-mono text-amber-800">{document.uncertainFields.join(", ")}</span>
                <p className="mt-0.5 text-[11px] text-amber-700">
                  Please confirm or correct these highlighted values before saving.
                </p>
              </div>
            </div>
          )}

          {/* Duplicate Resolution Alert */}
          {isDuplicate && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 text-xs text-amber-950">
              <p className="font-bold text-sm mb-1">
                {document.duplicateStatus === "exact_duplicate"
                  ? "Exact Duplicate Detected (Identical SHA-256 hash)"
                  : "Possible Duplicate Detected (Matching title, authority, and date)"}
              </p>
              <p className="text-amber-800 mb-3">
                This document matches an existing item in your vault. Do you want to keep both files or cancel?
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  onClick={handleKeepBoth}
                  disabled={duplicateMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                >
                  Keep Both Documents
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClose}
                  className="text-xs h-8 border-amber-300 text-amber-900"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Form Fields for Review / Edit */}
          <div className="space-y-3.5 text-xs">
            {/* Title */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                Document Title
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-xs rounded-lg border-slate-200"
              />
            </div>

            {/* Category & Subtype */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Document Type
                </Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {DocumentCategories.filter((c, i, a) => a.indexOf(c) === i).map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs capitalize">
                        {cat.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Sub-Type (e.g. hackathon, degree)
                </Label>
                <Input
                  value={subType}
                  placeholder="e.g. hackathon, technical"
                  onChange={(e) => setSubType(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-200"
                />
              </div>
            </div>

            {/* Person & Organization */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Participant / Holder Name
                </Label>
                <Input
                  value={personName}
                  placeholder="Holder name"
                  onChange={(e) => setPersonName(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-200"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Issuing Organization
                </Label>
                <Input
                  value={organization}
                  placeholder="e.g. Google, University"
                  onChange={(e) => setOrganization(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-200"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Issue Date
                </Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-200"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Expiry Date
                </Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-200"
                />
              </div>
            </div>

            {/* Achievement & Rank */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Achievement / Award
                </Label>
                <Input
                  value={achievement}
                  placeholder="e.g. 1st Place / Winner"
                  onChange={(e) => setAchievement(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-200"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Rank / Prize
                </Label>
                <Input
                  value={rank}
                  placeholder="e.g. 3rd Prize"
                  onChange={(e) => setRank(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-200"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                Tags (comma separated)
              </Label>
              <Input
                value={tagsInput}
                placeholder="e.g. AI, Hackathon, Cloud, 2026"
                onChange={(e) => setTagsInput(e.target.value)}
                className="h-9 text-xs rounded-lg border-slate-200"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                Description & Remarks
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-xs rounded-lg border-slate-200 resize-none"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/d/${document.id}`, "_blank")}
                className="h-8 text-xs border-slate-200 text-slate-700"
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                View Original
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReprocess}
                disabled={reprocessMutation.isPending}
                className="h-8 text-xs border-slate-200 text-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${reprocessMutation.isPending ? "animate-spin" : ""}`} />
                Reprocess with AI
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={reviewMutation.isPending}
                className="h-8 text-xs font-semibold shadow-sm"
                style={{ backgroundColor: "#c9a84c", color: "#1a2332" }}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Accept & Finalize
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
