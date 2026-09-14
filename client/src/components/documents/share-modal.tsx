import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentRecord, ShareRecord } from "@shared/schema";
import { useSharesForDocument, useCreateShare, useRevokeShare } from "@/hooks/use-documents";
import { Share2, Copy, Check, Clock, Eye, Trash2, ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { copyToClipboard as robustCopy } from "@/lib/utils";

interface ShareModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ document, isOpen, onClose }: ShareModalProps) {
  const [expiresInHours, setExpiresInHours] = useState<string>("24");
  const [accessLimit, setAccessLimit] = useState<string>("5");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [justGeneratedId, setJustGeneratedId] = useState<string | null>(null);

  const [permission, setPermission] = useState<"view" | "download" | "both">("both");

  const sharesQuery = useSharesForDocument(document?.id || "");
  const createShareMutation = useCreateShare();
  const revokeShareMutation = useRevokeShare();

  if (!document) return null;

  const getVerificationUrl = (shareId: string) => {
    return `${window.location.origin}/verify/${shareId}`;
  };

  const copyShareLink = async (text: string, id: string) => {
    await robustCopy(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleCreateShare = () => {
    createShareMutation.mutate(
      {
        documentId: document.id,
        expiresInHours: expiresInHours === "never" ? null : Number(expiresInHours),
        accessLimit: accessLimit === "unlimited" ? null : Number(accessLimit),
        permission,
      },
      {
        onSuccess: async (newShare: ShareRecord) => {
          const url = getVerificationUrl(newShare.id);
          await robustCopy(url);
          setCopiedLink(newShare.id);
          setJustGeneratedId(newShare.id);
          setTimeout(() => setCopiedLink(null), 3000);
        },
      }
    );
  };

  const shares = sharesQuery.data || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-2xl border-0 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 bg-white overflow-y-auto flex-1">
          <DialogHeader className="mb-5">
            <div className="flex items-center space-x-2 text-[#c9a84c] mb-1">
              <Share2 className="h-5 w-5" />
              <span className="text-xs uppercase font-bold tracking-widest">Controlled Credential Sharing</span>
            </div>
            <DialogTitle className="text-2xl font-display font-bold text-slate-900">
              Share Document
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              Generate a secure, time-limited verification link for <span className="font-semibold text-slate-800">"{document.originalName}"</span>. Recipients only see authorized fields.
            </DialogDescription>
          </DialogHeader>

          {/* New Share Link Generation */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Configure Access Policy</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-600 font-medium mb-1 block">Expiration Window</Label>
                <Select value={expiresInHours} onValueChange={setExpiresInHours}>
                  <SelectTrigger className="bg-white border-slate-200 h-9 text-xs">
                    <SelectValue placeholder="Select Expiry" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="1">1 Hour</SelectItem>
                    <SelectItem value="24">24 Hours (1 Day)</SelectItem>
                    <SelectItem value="168">7 Days</SelectItem>
                    <SelectItem value="720">30 Days</SelectItem>
                    <SelectItem value="never">No Expiration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-600 font-medium mb-1 block">Maximum Access Limit</Label>
                <Select value={accessLimit} onValueChange={setAccessLimit}>
                  <SelectTrigger className="bg-white border-slate-200 h-9 text-xs">
                    <SelectValue placeholder="Select Limit" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="1">1 View (Single-use)</SelectItem>
                    <SelectItem value="5">5 Views</SelectItem>
                    <SelectItem value="10">10 Views</SelectItem>
                    <SelectItem value="25">25 Views</SelectItem>
                    <SelectItem value="unlimited">Unlimited Views</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-600 font-medium mb-1 block">Permission Mode</Label>
                <Select value={permission} onValueChange={(val: any) => setPermission(val)}>
                  <SelectTrigger className="bg-white border-slate-200 h-9 text-xs">
                    <SelectValue placeholder="Permission" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="both">👁️ View & Download</SelectItem>
                    <SelectItem value="view">👁️ View Only</SelectItem>
                    <SelectItem value="download">⬇️ Download Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleCreateShare}
              disabled={createShareMutation.isPending}
              className="w-full font-semibold rounded-lg h-10 text-sm bg-slate-900 text-white hover:bg-slate-800"
            >
              {createShareMutation.isPending ? "Generating Share Link..." : "Generate Secure Verification Link"}
            </Button>

            {justGeneratedId && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center text-xs font-semibold text-emerald-800 mb-0.5">
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600 shrink-0" />
                    Auto-Copied Link to Clipboard!
                  </div>
                  <div className="font-mono text-[11px] text-emerald-700 truncate select-all">
                    {getVerificationUrl(justGeneratedId)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyShareLink(getVerificationUrl(justGeneratedId), justGeneratedId)}
                  className="bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs h-8 shrink-0 font-medium"
                >
                  {copiedLink === justGeneratedId ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Again
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Existing Shares List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Active & Past Shares ({shares.length})
            </h4>

            {shares.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                No share links generated yet for this document.
              </p>
            ) : (
              <div className="space-y-3">
                {shares.map((share) => {
                  const isExpired = share.expiresAt ? new Date() > new Date(share.expiresAt) : false;
                  const isLimitReached = share.accessLimit !== null && share.accessCount >= share.accessLimit;
                  const isRevoked = share.status === "REVOKED";
                  const isActive = !isExpired && !isLimitReached && !isRevoked;
                  const verificationUrl = getVerificationUrl(share.id);

                  return (
                    <div
                      key={share.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isActive ? "bg-emerald-500" : isRevoked ? "bg-slate-400" : "bg-amber-500"
                            }`}
                          />
                          <span className="font-mono text-xs font-semibold text-slate-800">
                            FV-{share.id.replace(/^fv_/, "").toUpperCase().slice(0, 8)}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isRevoked
                                ? "bg-slate-100 text-slate-600 border border-slate-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {isRevoked ? "Revoked" : isExpired ? "Expired" : isLimitReached ? "Limit Reached" : "Active"}
                          </span>
                        </div>

                        {isActive && (
                          <button
                            onClick={() => revokeShareMutation.mutate({ id: share.id, documentId: document.id })}
                            disabled={revokeShareMutation.isPending}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors font-medium"
                          >
                            Revoke Link
                          </button>
                        )}
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center">
                          <Eye className="h-3 w-3 mr-1 text-slate-400" />
                          {share.accessCount} / {share.accessLimit === null ? "∞" : share.accessLimit} views
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-slate-400" />
                          {share.expiresAt
                            ? `Expires ${format(new Date(share.expiresAt), "MMM d, h:mm a")}`
                            : "No expiry"}
                        </span>
                      </div>

                      {/* Action buttons */}
                      {isActive && (
                        <div className="flex items-center space-x-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyShareLink(verificationUrl, share.id)}
                            className="h-8 text-xs font-medium rounded-lg flex-1 border-slate-200"
                          >
                            {copiedLink === share.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                Copied Link
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 mr-1 text-slate-500" />
                                Copy Verification Link
                              </>
                            )}
                          </Button>
                          <a href={verificationUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-500 hover:text-slate-800">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <Button variant="outline" onClick={onClose} className="rounded-lg text-xs">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
