import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Loader2,
  ExternalLink,
  Shield,
  EyeOff,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicVerificationResponse } from "@shared/schema";
import { format } from "date-fns";
import { ScreenshotShield } from "@/components/security/screenshot-shield";
import { SecureDocumentViewer } from "@/components/security/secure-document-viewer";

export default function VerificationPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [data, setData] = useState<PublicVerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [showProtectedModal, setShowProtectedModal] = useState(false);
  const [modalScale, setModalScale] = useState(1);

  useEffect(() => {
    async function loadVerification() {
      if (!shareId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/verify/${shareId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: "Verification link not found" }));
          throw new Error(errData.message || "Invalid verification record");
        }
        const result: PublicVerificationResponse = await res.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || "Unable to verify credential");
      } finally {
        setLoading(false);
      }
    }
    loadVerification();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#c9a84c] mb-4" />
        <p className="text-slate-300 font-medium tracking-wide">Querying tamper-evident provenance record...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 bg-red-950/60 rounded-full flex items-center justify-center mb-6 border border-red-800">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-display font-bold text-white mb-2">Credential Verification Inactive</h1>
        <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
          {error || "This document share link does not exist, has been revoked by the holder, or has reached its access limit."}
        </p>
        <Link href="/">
          <Button variant="outline" className="text-slate-300 border-slate-700 hover:bg-slate-800 rounded-xl">
            Return to Vault Home
          </Button>
        </Link>
      </div>
    );
  }

  const isRevoked = data.shareStatus === "REVOKED";
  const isExpired = data.isExpired || data.shareStatus === "EXPIRED";
  const isLimitReached = data.shareStatus === "LIMIT_REACHED";
  const isInvalid = isRevoked || isExpired || isLimitReached;
  const isViewOnly = data.permission === "view" || (!data.downloadUrl && data.canViewFile);

  const handleOpenViewer = () => {
    if (isViewOnly) {
      setShowProtectedModal(true);
    } else if (data.filePreviewUrl) {
      window.open(data.filePreviewUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-8">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#c9a84c]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-8 relative z-10"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-5 sm:pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-[#c9a84c]/20 flex items-center justify-center border border-[#c9a84c]/40 shrink-0">
              <ShieldCheck className="h-5 w-5 text-[#c9a84c]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-display font-bold text-base sm:text-lg tracking-tight truncate">FileVault Verification</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">Cryptographically Recorded Credential</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#c9a84c] block">ID</span>
            <span className="text-xs font-mono font-bold text-slate-200">{data.verificationId}</span>
          </div>
        </div>

        {/* View-Only Protection Notice Banner */}
        {isViewOnly && !isInvalid && (
          <div className="mt-4 p-3 rounded-2xl bg-slate-800/80 border border-amber-500/30 flex items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2 text-xs text-[#c9a84c]">
              <Shield className="h-4 w-4 shrink-0 text-[#c9a84c]" />
              <span className="font-semibold">View-Only Protection Active</span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-200/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
              Screenshots Blocked
            </span>
          </div>
        )}

        {/* Warning Banner if Expired / Revoked */}
        {isInvalid && (
          <div className="my-5 p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="text-xs text-red-200">
              {isRevoked && "This credential share was revoked by the document holder."}
              {isExpired && "This credential share has passed its designated expiration window."}
              {isLimitReached && "The access quota for this share link has been exhausted."}
            </div>
          </div>
        )}

        {/* Verification Card Details */}
        <div className="py-5 sm:py-6 space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Verification Status
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <CheckCircle2 className={`h-4 w-4 ${data.status === "Verified" ? "text-emerald-400" : "text-amber-400"}`} />
                <span className={`text-sm font-bold ${data.status === "Verified" ? "text-emerald-400" : "text-amber-400"}`}>
                  {data.status} Credential
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Category
              </span>
              <span className="text-sm font-semibold text-slate-200 capitalize">
                {data.documentType}
              </span>
            </div>
          </div>

          <div className="space-y-3 bg-slate-800/30 p-4 rounded-xl border border-slate-800/50 text-sm">
            {data.recipientName && (
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 text-xs">Authorized Holder:</span>
                <span className="font-semibold text-slate-200 text-xs">{data.recipientName}</span>
              </div>
            )}

            {data.institution && (
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 text-xs">Issuing Authority:</span>
                <span className="font-semibold text-slate-200 text-xs">{data.institution}</span>
              </div>
            )}

            {data.certificateNumber && (
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 text-xs">Certificate / Record #:</span>
                <span className="font-mono text-slate-200 text-xs">{data.certificateNumber}</span>
              </div>
            )}

            {data.issueDate && (
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 text-xs">Issue Date:</span>
                <span className="text-slate-300 text-xs">{format(new Date(data.issueDate), "MMMM d, yyyy")}</span>
              </div>
            )}

            {data.expiryDate && (
              <div className="flex justify-between py-1">
                <span className="text-slate-400 text-xs">Validity / Expiry:</span>
                <span className="text-slate-300 text-xs">{format(new Date(data.expiryDate), "MMMM d, yyyy")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Inline Document Preview with Screenshot Protection */}
        {data.canViewFile && data.filePreviewUrl && (
          <div className="mb-5 sm:mb-6 rounded-2xl bg-slate-950/80 border border-slate-800/80 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/40 border-b border-slate-800/60">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#c9a84c] flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Verified Document Attachment
              </span>
              <button
                type="button"
                onClick={handleOpenViewer}
                className="text-[11px] text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-medium cursor-pointer"
              >
                Expand <Maximize2 className="h-3 w-3" />
              </button>
            </div>

            {data.mimeType === "application/pdf" ? (
              <ScreenshotShield
                isProtected={isViewOnly}
                recipientName={data.recipientName}
                verificationId={data.verificationId}
                className="rounded-b-2xl overflow-hidden p-6 text-center bg-black/40"
              >
                <FileText className="h-10 w-10 text-[#c9a84c] mb-2 mx-auto opacity-80" />
                <p className="text-xs font-semibold text-slate-200">
                  {data.originalName || "Document Attached"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">PDF Document • Protected View</p>
                <button
                  type="button"
                  onClick={handleOpenViewer}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#c9a84c] hover:underline cursor-pointer"
                >
                  Open in Secure Viewer <Maximize2 className="h-3 w-3" />
                </button>
              </ScreenshotShield>
            ) : (
              <div className="p-2 sm:p-3 bg-black/40 flex items-center justify-center min-h-[220px] rounded-b-2xl overflow-hidden">
                <SecureDocumentViewer
                  src={data.filePreviewUrl}
                  alt={data.originalName || data.recipientName || "Verified Document"}
                  mimeType={data.mimeType}
                  recipientName={data.recipientName}
                  verificationId={data.verificationId}
                  isProtected={isViewOnly}
                  className="max-h-[380px] w-auto max-w-full flex items-center justify-center"
                />
              </div>
            )}
          </div>
        )}

        {/* Action Buttons: Fully Responsive Stack on Mobile, Row on Desktop */}
        {(data.canViewFile || (data.downloadUrl && !isViewOnly)) && (
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {data.canViewFile && data.filePreviewUrl && (
              <Button
                variant="outline"
                onClick={handleOpenViewer}
                className="w-full sm:flex-1 text-slate-200 border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:text-white text-xs sm:text-sm h-11 sm:h-10 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all order-1"
              >
                <Eye className="h-4 w-4 text-[#c9a84c] shrink-0" />
                <span>View Full Document</span>
              </Button>
            )}

            {data.downloadUrl && !isViewOnly && (
              <a href={data.downloadUrl} className="w-full sm:flex-1 block order-2">
                <Button
                  className="w-full text-slate-950 font-bold text-xs sm:text-sm h-11 sm:h-10 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:opacity-95 transition-all"
                  style={{ backgroundColor: "#c9a84c" }}
                >
                  <Download className="h-4 w-4 text-slate-950 shrink-0" />
                  <span>Download Original</span>
                </Button>
              </a>
            )}
          </div>
        )}

        {/* Security watermark footer */}
        <div className="mt-5 sm:mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center">
            <Lock className="h-3 w-3 mr-1 text-[#c9a84c]" />
            Audited & Timestamped by FileVault Security Mesh
          </p>
        </div>
      </motion.div>

      {/* Fullscreen In-App Protected Viewer Modal */}
      {showProtectedModal && data.filePreviewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col">
          {/* Viewer Top Bar */}
          <div className="h-14 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-[#c9a84c]/20 border border-[#c9a84c]/30 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-[#c9a84c]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-white text-xs sm:text-sm font-semibold truncate">
                  {data.originalName || data.recipientName || "Verified Document"}
                </h3>
                {isViewOnly && (
                  <p className="text-[10px] text-[#c9a84c] font-medium flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" /> View Only • Screenshot Protection Active
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setModalScale((s) => Math.min(s + 0.25, 3))}
                className="h-8 w-8 text-slate-300 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setModalScale((s) => Math.max(s - 0.25, 0.5))}
                className="h-8 w-8 text-slate-300 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowProtectedModal(false)}
                className="h-8 w-8 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 ml-1"
                title="Close Viewer"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Viewer Body with Active Screenshot Shield */}
          <div className="flex-1 w-full min-h-0 overflow-auto flex items-center justify-center p-4 bg-black/60 relative">
            {data.mimeType === "application/pdf" ? (
              <ScreenshotShield
                isProtected={isViewOnly}
                recipientName={data.recipientName}
                verificationId={data.verificationId}
                className="max-w-full max-h-full flex items-center justify-center"
              >
                <iframe
                  src={`${data.filePreviewUrl}#toolbar=0&navpanes=0`}
                  title={data.originalName || "Document"}
                  className="w-[92vw] max-w-4xl h-[80vh] rounded-xl border border-slate-800 bg-white shadow-2xl"
                />
              </ScreenshotShield>
            ) : (
              <SecureDocumentViewer
                src={data.filePreviewUrl}
                alt={data.originalName || data.recipientName || "Verified Document"}
                mimeType={data.mimeType}
                recipientName={data.recipientName}
                verificationId={data.verificationId}
                isProtected={isViewOnly}
                scale={modalScale}
                className="max-h-[82vh] max-w-[90vw] flex items-center justify-center"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
