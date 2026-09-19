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

  const activeShares = shares.filter((s) => s.status === "ACTIVE");

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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <motion.div 
            whileHover={{ y: -2 }}
            className="col-span-1 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">ACTIVE LINKS</span>
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Share2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-display">{activeShares.length}</div>
            <p className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Live & ready
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -2 }}
            className="col-span-1 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">RECIPIENT VIEWS</span>
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Eye className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-display">{totalAccesses}</div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">Verified accesses</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -2 }}
            className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5 sm:mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">SECURITY INTEGRITY</span>
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Lock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-display">Zero-Leak</div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Single-token cryptographic enforcement</p>
          </motion.div>
        </div>

        {/* Shared Links List */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Access Grants ({shares.length})
            </h3>
            <span className="text-xs text-slate-400">
              {activeShares.length} active
            </span>
          </div>

          {shares.length === 0 ? (
            <div className="p-10 sm:p-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Share2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">No shared links created yet</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Open any document in your Vault and click "Share" to generate a controlled verification link.
              </p>
            </div>
          ) : (
            <div>
              {/* MOBILE SHARED LINK CARDS (< sm breakpoint) */}
              <div className="sm:hidden divide-y divide-slate-100">
                {shares.map((share) => {
                  const isRevoked = share.status === "REVOKED";
                  const isActive = !isRevoked;
                  const tokenShort = `FV-${share.id.replace(/^fv_/, "").toUpperCase().slice(0, 8)}`;
                  const recipients = share.recipientEmails || [];

                  return (
                    <div key={share.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                      {/* Top: Doc info + status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                            <FileText className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs text-slate-900 truncate" title={share.documentName}>
                              {share.documentName || "Vault Document"}
                            </h4>
                            <p className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">
                              {share.documentType || "general"} • {tokenShort}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isActive ? (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
                            Revoked
                          </span>
                        )}
                      </div>

                      {/* Middle: Authorized Recipients */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Authorized Recipients ({recipients.length})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {recipients.length > 0 ? (
                            recipients.map((email, idx) => (
                              <span key={idx} className="text-[11px] font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                                {email}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Direct Link</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => copyToClipboard(share.id)}
                          className="flex-1 h-8 rounded-xl text-xs font-semibold bg-slate-950 text-white shadow-2xs hover:bg-slate-800"
                        >
                          {copiedId === share.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                            </>
                          )}
                        </Button>

                        <a 
                          href={`/verify/${share.id}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Open Verification Link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>

                        {isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={revokeShareMutation.isPending}
                            onClick={() => revokeShareMutation.mutate({ id: share.id, documentId: share.documentId })}
                            className="h-8 px-2.5 rounded-xl text-xs text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW (sm:block) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Shared Document</th>
                      <th className="py-3 px-4">Authorized Recipients</th>
                      <th className="py-3 px-4">Verification URL / Token</th>
                      <th className="py-3 px-4">Views</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shares.map((share) => {
                      const isRevoked = share.status === "REVOKED";
                      const isActive = !isRevoked;
                      const recipients = share.recipientEmails || [];

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

                          {/* Authorized Recipients */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {recipients.length > 0 ? (
                                recipients.map((email, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200/80"
                                  >
                                    {email}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Direct Link</span>
                              )}
                            </div>
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
                            {share.accessCount || 0}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {isActive ? (
                              <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                Revoked
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <a
                                href={`/verify/${share.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                title="Open verification preview"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              {isActive && (
                                <button
                                  onClick={() => revokeShareMutation.mutate({ id: share.id, documentId: share.documentId })}
                                  disabled={revokeShareMutation.isPending}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Revoke access immediately"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
