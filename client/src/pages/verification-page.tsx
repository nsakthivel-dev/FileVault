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
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicVerificationResponse } from "@shared/schema";
import { format } from "date-fns";

export default function VerificationPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [data, setData] = useState<PublicVerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#c9a84c]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-[#c9a84c]/20 flex items-center justify-center border border-[#c9a84c]/40">
              <ShieldCheck className="h-5 w-5 text-[#c9a84c]" />
            </div>
            <div>
              <h2 className="text-white font-display font-bold text-lg tracking-tight">FileVault Verification</h2>
              <p className="text-xs text-slate-400">Cryptographically Recorded Credential</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#c9a84c] block">ID</span>
            <span className="text-xs font-mono font-bold text-slate-200">{data.verificationId}</span>
          </div>
        </div>

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
        <div className="py-6 space-y-4">
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

        {/* Inline Document Preview */}
        {data.canViewFile && data.filePreviewUrl && (
          <div className="mb-6 rounded-2xl bg-slate-950/80 border border-slate-800/80 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/40 border-b border-slate-800/60">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#c9a84c] flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Verified Document Attachment
              </span>
              <a
                href={data.filePreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                Expand <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="relative min-h-[200px] max-h-[420px] flex items-center justify-center p-3 bg-black/40">
              {!imageLoaded && !imageFailed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/70">
                  <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c] mb-2" />
                  <span className="text-xs text-slate-400">Loading document image...</span>
                </div>
              )}

              {!imageFailed ? (
                <img
                  src={data.filePreviewUrl}
                  alt={data.originalName || data.recipientName || "Verified Document"}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setImageFailed(true);
                    setImageLoaded(true);
                  }}
                  className={`max-h-[380px] w-auto max-w-full rounded-lg object-contain transition-opacity duration-300 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                />
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <FileText className="h-10 w-10 text-[#c9a84c] mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-slate-200">
                    {data.originalName || "Document Attached"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {data.mimeType === "application/pdf" ? "PDF Document" : "Secured Vault Document"}
                  </p>
                  <a
                    href={data.filePreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#c9a84c] hover:underline"
                  >
                    Open Document in New Tab <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons if File Access is Allowed */}
        {data.canViewFile && (
          <div className="pt-2 border-t border-slate-800 flex items-center space-x-3">
            {data.filePreviewUrl && (
              <a
                href={data.filePreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button
                  variant="outline"
                  className="w-full text-slate-300 border-slate-700 hover:bg-slate-800 text-xs h-10 font-semibold rounded-xl"
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  View Original Document
                </Button>
              </a>
            )}

            {data.downloadUrl && (
              <a href={data.downloadUrl} className="flex-1">
                <Button
                  className="w-full text-slate-900 font-semibold text-xs h-10 rounded-xl"
                  style={{ backgroundColor: "#c9a84c" }}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </Button>
              </a>
            )}
          </div>
        )}

        {/* Security watermark footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center">
            <Lock className="h-3 w-3 mr-1 text-[#c9a84c]" />
            Audited & Timestamped by FileVault Security Mesh
          </p>
        </div>
      </motion.div>
    </div>
  );
}
