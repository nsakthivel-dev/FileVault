import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentRecord, ShareRecord } from "@shared/schema";
import { useCreateShare } from "@/hooks/use-documents";
import { Share2, Copy, Check, Plus, Trash2, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { copyToClipboard as robustCopy } from "@/lib/utils";

interface ShareModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ document, isOpen, onClose }: ShareModalProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [generatedShare, setGeneratedShare] = useState<ShareRecord | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const createShareMutation = useCreateShare();

  if (!document) return null;

  const handleClose = () => {
    setEmails([""]);
    setGeneratedShare(null);
    setIsCopied(false);
    setValidationError(null);
    onClose();
  };

  const handleAddEmail = () => {
    setEmails((prev) => [...prev, ""]);
  };

  const handleEmailChange = (index: number, value: string) => {
    setEmails((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (validationError) setValidationError(null);
  };

  const handleRemoveEmail = (index: number) => {
    setEmails((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  };

  const getVerificationUrl = (shareId: string) => {
    return `${window.location.origin}/verify/${shareId}`;
  };

  const handleCopyLink = async () => {
    if (!generatedShare) return;
    const url = getVerificationUrl(generatedShare.id);
    await robustCopy(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleGenerateShareLink = () => {
    // Validate email inputs
    const trimmedEmails = emails.map((e) => e.trim()).filter(Boolean);
    if (trimmedEmails.length === 0) {
      setValidationError("Please enter at least one recipient email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = trimmedEmails.filter((e) => !emailRegex.test(e));
    if (invalid.length > 0) {
      setValidationError(`Invalid email format: ${invalid[0]}`);
      return;
    }

    setValidationError(null);

    createShareMutation.mutate(
      {
        documentId: document.id,
        emails: trimmedEmails,
      },
      {
        onSuccess: (newShare: ShareRecord) => {
          setGeneratedShare(newShare);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[94vw] sm:max-w-md p-0 overflow-hidden rounded-2xl sm:rounded-3xl border-0 shadow-2xl z-50">
        <div className="p-5 sm:p-6 bg-white flex flex-col space-y-5">
          {/* Modal Header */}
          <DialogHeader className="text-left space-y-1.5">
            <div className="flex items-center space-x-2 text-[#c9a84c]">
              <div className="h-7 w-7 rounded-lg bg-[#c9a84c]/15 flex items-center justify-center">
                <Share2 className="h-4 w-4 text-[#c9a84c]" />
              </div>
              <span className="text-[11px] uppercase font-bold tracking-widest text-[#c9a84c]">
                Document Access
              </span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-display font-bold text-slate-900">
              Share Document
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs sm:text-sm">
              Share <span className="font-semibold text-slate-800">"{document.originalName}"</span> with a recipient.
            </DialogDescription>
          </DialogHeader>

          {/* Form State: Enter Recipient Emails */}
          {!generatedShare ? (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  Email Address
                </Label>

                <div className="space-y-2">
                  {emails.map((email, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="email"
                        placeholder="Enter recipient email"
                        value={email}
                        onChange={(e) => handleEmailChange(index, e.target.value)}
                        className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 focus-visible:ring-[#c9a84c] focus-visible:border-[#c9a84c]"
                        disabled={createShareMutation.isPending}
                        autoFocus={index === 0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleGenerateShareLink();
                          }
                        }}
                      />
                      {emails.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEmail(index)}
                          className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl shrink-0"
                          title="Remove email"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddEmail}
                  disabled={createShareMutation.isPending}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors pt-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add another email
                </button>
              </div>

              {/* Validation or API error */}
              {(validationError || createShareMutation.error) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                  {validationError || createShareMutation.error?.message}
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  onClick={handleGenerateShareLink}
                  disabled={createShareMutation.isPending}
                  className="w-full h-11 rounded-xl font-semibold text-xs sm:text-sm bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {createShareMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating Share Link...</span>
                    </>
                  ) : (
                    <span>Generate Share Link</span>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Generated State: Copy Share Link */
            <div className="space-y-4 pt-1 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  Share link created successfully
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Only authorized email recipients can view and verify this credential.
                </p>
                {generatedShare.recipientEmails && generatedShare.recipientEmails.length > 0 && (
                  <div className="pt-1.5 flex flex-wrap gap-1.5">
                    {generatedShare.recipientEmails.map((email, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100/90 text-emerald-800 border border-emerald-200"
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Generated link + Copy Link button */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 block">
                  Share Link
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={getVerificationUrl(generatedShare.id)}
                    className="h-10 text-xs font-mono text-slate-700 bg-slate-50 border-slate-200 rounded-xl select-all"
                  />
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    className={`h-10 px-4 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                      isCopied
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Bottom Done Action */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setGeneratedShare(null);
                    setEmails([""]);
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Share with more recipients
                </button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="h-9 px-5 rounded-xl text-xs font-semibold border-slate-300 hover:bg-slate-100"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
