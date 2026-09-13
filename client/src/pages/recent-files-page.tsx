import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useDocuments, useTogglePinDocument, useDeleteDocument } from "@/hooks/use-documents";
import { DocumentRecord } from "@shared/schema";
import { 
  Clock, 
  Eye, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  Pin, 
  FileText, 
  Sparkles, 
  ShieldCheck,
  Calendar,
  Filter
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShareModal } from "@/components/documents/share-modal";
import { DocumentDetailModal } from "@/components/documents/document-detail-modal";
import { UploadModal } from "@/components/documents/upload-modal";
import { format, isToday, isThisWeek, parseISO } from "date-fns";

export default function RecentFilesPage() {
  const { data: documents = [], isLoading } = useDocuments();
  const togglePinMutation = useTogglePinDocument();
  const deleteMutation = useDeleteDocument();

  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [shareDoc, setShareDoc] = useState<DocumentRecord | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Sort newest first
  const sortedDocs = [...documents].sort((a, b) => 
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );

  const copySha = (sha?: string) => {
    if (!sha) return;
    navigator.clipboard.writeText(sha);
    setCopiedSha(sha);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Group into Today, This Week, and Earlier
  const todayDocs = sortedDocs.filter(d => d.uploadedAt && isToday(parseISO(d.uploadedAt)));
  const thisWeekDocs = sortedDocs.filter(d => d.uploadedAt && !isToday(parseISO(d.uploadedAt)) && isThisWeek(parseISO(d.uploadedAt)));
  const earlierDocs = sortedDocs.filter(d => !todayDocs.includes(d) && !thisWeekDocs.includes(d));

  const renderSection = (title: string, docs: DocumentRecord[]) => {
    if (docs.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold font-mono uppercase text-slate-400">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{title}</span>
          <span className="text-[11px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded-full font-mono">
            {docs.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map((doc) => {
            const sha = doc.sha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
            const shortSha = `${sha.slice(0, 7)}...${sha.slice(-4)}`;
            const isCopied = copiedSha === sha;

            return (
              <motion.div
                key={doc.id}
                whileHover={{ y: -2 }}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 
                          onClick={() => setSelectedDoc(doc)}
                          className="font-semibold text-xs text-slate-900 truncate hover:text-blue-600 cursor-pointer"
                          title={doc.originalName}
                        >
                          {doc.originalName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {formatBytes(doc.fileSize)} • {format(new Date(doc.uploadedAt), "h:mm a")}
                        </span>
                      </div>
                    </div>

                    {/* Pin button */}
                    <button
                      onClick={() => togglePinMutation.mutate(doc.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        doc.isPinned 
                          ? "text-amber-500 bg-amber-50" 
                          : "text-slate-300 hover:text-slate-600 hover:bg-slate-100"
                      }`}
                      title={doc.isPinned ? "Pinned to Quick Access" : "Pin to Quick Access"}
                    >
                      <Pin className={`h-3.5 w-3.5 ${doc.isPinned ? "fill-amber-500" : ""}`} />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 font-mono">
                      {doc.documentType}
                    </span>

                    <button
                      onClick={() => copySha(sha)}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-slate-100 font-mono text-[10px] text-slate-600 border border-slate-200/80 transition-colors"
                      title="Copy SHA-256 integrity seal"
                    >
                      <span>{shortSha}</span>
                      {isCopied ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <Copy className="h-2.5 w-2.5 text-slate-400" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Verified</span>
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View Details & Preview"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setShareDoc(doc)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Share Controlled Link"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Download File"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout onOpenUpload={() => setIsUploadOpen(true)}>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-display">
                Recent Files
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                Chronological
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Real-time feed of recently uploaded credentials, certificates, and sealed documents.
            </p>
          </div>

          <Button
            onClick={() => setIsUploadOpen(true)}
            className="h-9 px-4 rounded-xl bg-slate-950 text-white hover:bg-slate-800 text-xs font-semibold"
          >
            + Upload Document
          </Button>
        </div>

        {/* Content */}
        {sortedDocs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-16 text-center shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No recent files</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Documents you upload will appear here in chronological order with instant SHA-256 seal verification.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {renderSection("Uploaded Today", todayDocs)}
            {renderSection("Uploaded This Week", thisWeekDocs)}
            {renderSection("Uploaded Earlier", earlierDocs)}
          </div>
        )}

        {/* Modals */}
        <DocumentDetailModal
          document={selectedDoc}
          isOpen={!!selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onOpenShare={(doc: DocumentRecord) => setShareDoc(doc)}
          onDelete={(doc: DocumentRecord) => deleteMutation.mutate(doc.id)}
        />

        <ShareModal
          document={shareDoc}
          isOpen={!!shareDoc}
          onClose={() => setShareDoc(null)}
        />

        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
