import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useUserShares, useRevokeShare } from "@/hooks/use-documents";
import { 
  Share2, 
  ExternalLink, 
  Copy, 
  Check, 
  Trash2, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  Download, 
  Eye, 
  Link2,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { copyToClipboard as robustCopy } from "@/lib/utils";

export default function SharedLinksPage() {
  const { data: shares = [], isLoading } = useUserShares();
  const revokeShareMutation = useRevokeShare();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (shareId: string) => {
    const url = `${window.location.origin}/verify/${shareId}`;
    await robustCopy(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeShares = shares.filter((s) => {
    const isExpired = s.expiresAt ? new Date() > new Date(s.expiresAt) : false;
    const isLimitReached = s.accessLimit !== null && s.accessCount >= s.accessLimit;
    return s.status === "ACTIVE" && !isExpired && !isLimitReached;
  });

  const totalAccesses = shares.reduce((acc, s) => acc + (s.accessCount || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-display">
                Shared Links
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                {shares.length} records
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Track and govern documents shared with external recipients. Manage permissions (view-only vs. download) and revoke access anytime.
            </p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div 
            whileHover={{ y: -2 }}
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">ACTIVE SHARED LINKS</span>
              <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Share2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 font-display">{activeShares.length}</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live & ready for verification
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -2 }}
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">TOTAL RECIPIENT ACCESSES</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Eye className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 font-display">{totalAccesses}</div>
            <p className="text-[11px] text-slate-500 mt-1">Verified views and downloads</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -2 }}
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">CRYPTOGRAPHIC CONTROL</span>
              <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Lock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 font-display">Zero-Leak</div>
            <p className="text-[11px] text-slate-500 mt-1">Single-token hardware enforcement</p>
          </motion.div>
        </div>

        {/* Shared Links List */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              All Active & Past Access Grants
            </h3>
            <span className="text-xs text-slate-400">
              Showing {shares.length} links
            </span>
          </div>

          {shares.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Share2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">No shared links created yet</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Open any document in your Vault and click "Share" to generate a controlled verification link with view or download privileges.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Shared Document</th>
                    <th className="py-3 px-4">Permission Mode</th>
                    <th className="py-3 px-4">Verification URL / Token</th>
                    <th className="py-3 px-4">Access Count</th>
                    <th className="py-3 px-4">Status & Expiration</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shares.map((share) => {
                    const isExpired = share.expiresAt ? new Date() > new Date(share.expiresAt) : false;
                    const isLimitReached = share.accessLimit !== null && share.accessCount >= share.accessLimit;
                    const isRevoked = share.status === "REVOKED";
                    const isActive = !isExpired && !isLimitReached && !isRevoked;
                    const perm = share.permission || "both";

                    return (
                      <motion.tr 
                        key={share.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Document Name */}
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center space-x-2.5">
                            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-xs text-slate-900 max-w-[200px]">
                                {share.documentName || "Vault Document"}
                              </div>
                              <span className="text-[10px] text-slate-400 uppercase font-mono">
                                {share.documentType || "general"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Permission */}
                        <td className="py-3.5 px-4">
                          {perm === "view" && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Eye className="h-3 w-3" />
                              <span>View Only</span>
                            </span>
                          )}
                          {perm === "download" && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Download className="h-3 w-3" />
                              <span>Download Only</span>
                            </span>
                          )}
                          {perm === "both" && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="h-3 w-3" />
                              <span>View & Download</span>
                            </span>
                          )}
                        </td>

                        {/* Verification Token / Copy */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => copyToClipboard(share.id)}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 font-mono text-[11px] text-slate-700 border border-slate-200/60 transition-colors group"
                            title="Click to copy public link"
                          >
                            <span>FV-{share.id.replace(/^fv_/, "").toUpperCase().slice(0, 8)}</span>
                            {copiedId === share.id ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                            )}
                          </button>
                        </td>

                        {/* Access Count */}
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {share.accessCount} / {share.accessLimit === null ? "∞" : share.accessLimit}
                          <span className="text-[10px] text-slate-400 block">
                            {share.accessLimit ? "views allowed" : "unlimited"}
                          </span>
                        </td>

                        {/* Status & Expiry */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${
                              isActive ? "bg-emerald-500" : isRevoked ? "bg-slate-400" : "bg-amber-500"
                            }`} />
                            <span className="font-semibold text-xs text-slate-800">
                              {isRevoked ? "Revoked" : isExpired ? "Expired" : isLimitReached ? "Limit Reached" : "Active"}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {share.expiresAt 
                              ? `Expires: ${format(new Date(share.expiresAt), "MMM d, h:mm a")}` 
                              : "Never expires"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {/* Open public page in new tab */}
                            <a
                              href={`/verify/${share.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Preview Public Verification Page"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>

                            {/* Revoke */}
                            {isActive && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => revokeShareMutation.mutate({ id: share.id, documentId: share.documentId })}
                                disabled={revokeShareMutation.isPending}
                                className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function FileText(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
