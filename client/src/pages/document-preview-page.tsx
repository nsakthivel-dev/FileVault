import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Download, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useDocument } from "@/hooks/use-documents";
import { buildUrl, api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/format";

export default function DocumentPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: document, isLoading, error } = useDocument(id || "");

  const handleDownload = () => {
    if (document) {
      const url = buildUrl(api.documents.download.path, { id: document.id });
      window.open(url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
        <p className="text-slate-500 font-medium tracking-wide animate-pulse">Decrypting preview...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">Document Unavailable</h1>
        <p className="text-slate-500 text-center max-w-md mb-8">
          The file you're trying to access doesn't exist or you don't have permission to view it.
        </p>
        <Link href="/">
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20">
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Vault
          </Button>
        </Link>
      </div>
    );
  }

  const isImage = document.mimeType.startsWith('image/');
  const isPdf = document.mimeType === 'application/pdf';
  const canPreview = isImage || isPdf;
  const downloadUrl = buildUrl(api.documents.download.path, { id: document.id });

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-4 min-w-0">
          <Link href="/">
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center space-x-3 min-w-0 border-l border-slate-800 pl-4">
            <div className="h-8 w-8 bg-slate-800 rounded-md flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-accent" />
            </div>
            <div className="truncate">
              <h2 className="font-semibold text-sm truncate">{document.originalName}</h2>
              <p className="text-xs text-slate-500">{formatBytes(document.fileSize)} • {formatDate(document.createdAt)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center shrink-0 ml-4">
          <Button 
            onClick={handleDownload}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg shadow-lg shadow-accent/20"
          >
            <Download className="mr-2 h-4 w-4" /> Download Original
          </Button>
        </div>
      </header>

      {/* Main Preview Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-slate-900 overflow-hidden relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full h-full max-w-5xl bg-slate-950 rounded-2xl border border-slate-800 premium-shadow overflow-hidden flex flex-col"
        >
          {canPreview ? (
            <iframe 
              src={downloadUrl} 
              className="w-full h-full bg-white"
              title={document.originalName}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="h-24 w-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-2">No Preview Available</h3>
              <p className="text-slate-400 max-w-md mb-8">
                This file type ({document.mimeType}) cannot be previewed securely in the browser. Please download the file to view its contents.
              </p>
              <Button 
                onClick={handleDownload}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-black/20"
              >
                <Download className="mr-2 h-5 w-5" /> Download to View
              </Button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
