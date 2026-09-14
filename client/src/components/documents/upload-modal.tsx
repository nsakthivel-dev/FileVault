import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CloudUpload, 
  File, 
  X, 
  Loader2, 
  Shield, 
  Sparkles, 
  CheckCircle2, 
  FileText,
  Files
} from "lucide-react";
import { useUploadDocument, useBatchUpload } from "@/hooks/use-documents";
import { formatBytes } from "@/lib/format";
import { DocumentCategories } from "@shared/schema";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState<string>("certificate");
  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [institution, setInstitution] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [description, setDescription] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<"idle" | "uploading" | "processing" | "done">("idle");

  const singleUpload = useUploadDocument();
  const batchUpload = useBatchUpload();

  const isPending = singleUpload.isPending || batchUpload.isPending || uploadStep === "processing";

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setFileError(null);
    if (fileRejections.length > 0) {
      const rej = fileRejections[0];
      if (rej.errors?.[0]?.code === "file-too-large") {
        setFileError("One or more files exceed the maximum 15MB limit.");
      } else {
        setFileError(rej.errors?.[0]?.message || "Invalid format. Supported: PDF, PNG, JPG, JPEG, WEBP, DOCX.");
      }
      return;
    }
    if (acceptedFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 15 * 1024 * 1024, // 15MB limit
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;

    if (selectedFiles.length === 1) {
      setUploadStep("uploading");
      singleUpload.mutate(
        {
          file: selectedFiles[0],
          documentType,
          recipientName: recipientName.trim() || undefined,
          institution: institution.trim() || undefined,
          certificateNumber: certificateNumber.trim() || undefined,
          issueDate: issueDate || undefined,
          expiryDate: expiryDate || undefined,
          description: description.trim() || undefined,
        },
        {
          onSuccess: () => {
            setUploadStep("processing");
            setTimeout(() => {
              handleClose();
            }, 1200);
          },
          onError: () => {
            setUploadStep("idle");
          },
        }
      );
    } else {
      // Multiple files batch upload
      setUploadStep("uploading");
      batchUpload.mutate(selectedFiles, {
        onSuccess: () => {
          setUploadStep("processing");
          setTimeout(() => {
            handleClose();
          }, 1200);
        },
        onError: () => {
          setUploadStep("idle");
        },
      });
    }
  };

  const handleClose = () => {
    if (isPending) return;
    setSelectedFiles([]);
    setDocumentType("certificate");
    setTitle("");
    setRecipientName("");
    setInstitution("");
    setCertificateNumber("");
    setIssueDate("");
    setExpiryDate("");
    setDescription("");
    setFileError(null);
    setUploadStep("idle");
    onClose();
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "resume":
        return "📄 Resume / CV";
      case "certificate":
      case "certificates":
        return "🏅 Certificate & Credential";
      case "achievement":
        return "🏆 Achievement / Award";
      case "hackathon":
        return "⚡ Hackathon (Winning / Participation)";
      case "internship":
        return "💼 Internship Certificate";
      case "employment":
        return "🏢 Employment Document";
      case "offer_letter":
        return "✉️ Offer Letter";
      case "experience_letter":
        return "📜 Experience Letter";
      case "education":
        return "🎓 Education & Academics";
      case "degree":
        return "📜 Degree Certificate";
      case "marksheet":
        return "📊 Marksheet / Transcript";
      case "course":
        return "📚 Course Certificate";
      case "workshop":
        return "🛠️ Workshop Certificate";
      case "project":
        return "🚀 Project Document";
      case "participation":
        return "🎖️ Participation Certificate";
      case "identity":
        return "🪪 Identity / Personal Document";
      default:
        return "📁 Other Document";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[94vw] sm:max-w-xl p-0 overflow-hidden rounded-2xl sm:rounded-3xl border-0 shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col z-50">
        <div className="p-4 sm:p-6 bg-white overflow-y-auto flex-1">
          <DialogHeader className="mb-4 sm:mb-5">
            <div className="flex items-center space-x-2 text-[#c9a84c] mb-1">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest">AI Intelligence Vault</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-display font-bold text-slate-900 flex items-center justify-between">
              <span>Vault Document Upload</span>
              <span className="inline-flex items-center text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                <Sparkles className="w-3 h-3 mr-1 text-[#c9a84c]" />
                Gemini 3.5
              </span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs sm:text-sm">
              Upload career files or certificates. Gemini AI automatically understands, classifies, and organizes them.
            </DialogDescription>
          </DialogHeader>

          {/* File Dropzone */}
          <div className="space-y-3">
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-all duration-200 tap-highlight-transparent
                ${isDragActive ? "border-[#c9a84c] bg-amber-50/30 scale-[0.99]" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"}
              `}
            >
              <input {...getInputProps()} />
              <div className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center">
                <CloudUpload className={`h-5 w-5 sm:h-6 sm:w-6 ${isDragActive ? "text-[#c9a84c]" : "text-slate-400"}`} />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 mb-0.5">
                {isDragActive ? "Drop documents here" : "Tap to choose photos or files"}
              </p>
              <p className="text-[11px] text-slate-400">
                Supports PDF, PNG, JPG, JPEG, WEBP, DOCX (up to 15MB)
              </p>
            </div>
            {fileError && <p className="text-xs text-red-500 font-medium px-1">{fileError}</p>}
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                <span>Selected Documents ({selectedFiles.length})</span>
                {selectedFiles.length > 1 && (
                  <button
                    onClick={() => setSelectedFiles([])}
                    disabled={isPending}
                    className="text-red-500 hover:text-red-700 text-xs normal-case font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <FileText className="h-4 w-4 text-[#c9a84c] flex-shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{file.name}</span>
                      <span className="text-slate-400 flex-shrink-0">({formatBytes(file.size)})</span>
                    </div>
                    {!isPending && (
                      <button
                        onClick={() => removeFile(idx)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 ml-2"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Status Tracker */}
          {uploadStep !== "idle" && (
            <div className="mt-4 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center space-x-3 text-xs text-amber-900 animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-[#c9a84c] flex-shrink-0" />
              <div>
                <p className="font-bold">
                  {uploadStep === "uploading" ? "Uploaded securely to vault..." : "Analyzing & Extracting with Gemini 3.5 Flash..."}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Validating SHA-256 hash, classifying document type, extracting skills and metadata.
                </p>
              </div>
            </div>
          )}

          {/* Optional Single-File Metadata Fields */}
          {selectedFiles.length === 1 && uploadStep === "idle" && (
            <div className="space-y-3.5 mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Optional Guidance (AI will auto-fill if left blank)
                </span>
              </div>

              {/* Category */}
              <div>
                <Label className="text-xs font-medium text-slate-600 block mb-1">
                  Expected Category
                </Label>
                <Select value={documentType} onValueChange={setDocumentType} disabled={isPending}>
                  <SelectTrigger className="w-full bg-white border-slate-200 rounded-lg h-9 text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-100 max-h-60">
                    {DocumentCategories.filter((c, i, arr) => arr.indexOf(c) === i).map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {getCategoryLabel(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient & Authority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-slate-600 block mb-1">
                    Holder / Recipient Name
                  </Label>
                  <Input
                    placeholder="e.g. N. Sakthivel"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    disabled={isPending}
                    className="rounded-lg border-slate-200 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 block mb-1">
                    Issuing Organization
                  </Label>
                  <Input
                    placeholder="e.g. Google / Microsoft / University"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    disabled={isPending}
                    className="rounded-lg border-slate-200 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs font-medium text-slate-600 block mb-1">
                  Custom Notes / Description
                </Label>
                <Textarea
                  placeholder="Additional context or remarks..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                  rows={2}
                  className="rounded-lg border-slate-200 text-xs resize-none"
                />
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {selectedFiles.length > 1 ? "Batch processing creates independent AI jobs" : "SHA-256 encrypted & deduplicated"}
            </span>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending} className="text-xs font-medium">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isPending}
                className="font-semibold shadow-md rounded-lg text-xs px-4"
                style={{ backgroundColor: "#c9a84c", color: "#1a2332" }}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Processing...
                  </>
                ) : selectedFiles.length > 1 ? (
                  <>
                    <Files className="mr-1.5 h-3.5 w-3.5" />
                    Batch Upload ({selectedFiles.length})
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Vault & Analyze
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
