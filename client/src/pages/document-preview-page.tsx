import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize
} from "lucide-react";
import { useDocument } from "@/hooks/use-documents";
import { buildUrl, api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatDate } from "@/lib/format";

export default function DocumentPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: document, isLoading, error } = useDocument(id || "");
  const [isEdgeToEdge, setIsEdgeToEdge] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Image zoom & rotation controls
  const [imgScale, setImgScale] = useState(1);
  const [imgRotation, setImgRotation] = useState(0);

  const handleDownload = () => {
    if (document) {
      const url = buildUrl(api.documents.download.path, { id: document.id });
      window.open(url, "_blank");
    }
  };

  const handleOpenRaw = () => {
    if (document) {
      const url = buildUrl(api.documents.preview.path, { id: document.id });
      window.open(url, "_blank");
    }
  };

  const toggleFullscreen = () => {
    if (!window.document.fullscreenElement) {
      window.document.documentElement.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        setIsEdgeToEdge((prev) => !prev);
      });
    } else {
      window.document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
        <p className="text-slate-400 font-medium tracking-wide animate-pulse">Decrypting preview...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <AlertCircle className="h-16 w-16 text-rose-500 mb-6" />
        <h1 className="text-2xl font-display font-bold text-white mb-2">Document Unavailable</h1>
        <p className="text-slate-400 text-center max-w-md mb-8">
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

  const isImage = document.mimeType.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf";
  const canPreview = isImage || isPdf;
  const previewUrl = buildUrl(api.documents.preview.path, { id: document.id });

  return (
    <div className="h-screen h-[100dvh] w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Bar Header */}
      <header className="h-14 flex items-center justify-between px-3 sm:px-6 bg-slate-900/95 border-b border-slate-800 shrink-0 z-20 backdrop-blur">
        {/* Document Info & Back */}
        <div className="flex items-center space-x-3 min-w-0">
          <Link href="/">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg shrink-0 px-2 sm:px-3"
              title="Return to Vault"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline text-xs font-medium">Back</span>
            </Button>
          </Link>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="font-semibold text-xs sm:text-sm truncate text-white max-w-[180px] sm:max-w-md md:max-w-lg" title={document.originalName}>
                  {document.originalName}
                </h2>
                {document.documentType && (
                  <Badge variant="outline" className="hidden md:inline-flex text-[10px] py-0 px-1.5 border-slate-700 bg-slate-800/80 text-slate-300 capitalize">
                    {document.documentType}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {formatBytes(document.fileSize)} • {formatDate(document.uploadedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Image Controls */}
          {isImage && (
            <div className="hidden sm:flex items-center space-x-1 bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 mr-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-300 hover:text-white"
                onClick={() => setImgScale((s) => Math.min(s + 0.25, 3))}
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-300 hover:text-white"
                onClick={() => setImgScale((s) => Math.max(s - 0.25, 0.5))}
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-300 hover:text-white text-[11px] font-mono"
                onClick={() => setImgScale(1)}
                title="Actual Size (100%)"
              >
                1:1
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-300 hover:text-white"
                onClick={() => setImgRotation((r) => (r + 90) % 360)}
                title="Rotate"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Toggle Edge-to-Edge view */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEdgeToEdge((v) => !v)}
            className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-2 sm:px-2.5 rounded-lg text-xs"
            title={isEdgeToEdge ? "Boxed View" : "Expand to Full Width"}
          >
            {isEdgeToEdge ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden md:inline">Boxed</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden md:inline">Full Width</span>
              </>
            )}
          </Button>

          {/* Toggle Native Fullscreen */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-2 sm:px-2.5 rounded-lg text-xs"
            title="Toggle Fullscreen"
          >
            <Maximize className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden lg:inline">Fullscreen</span>
          </Button>

          {/* Open Raw in New Tab */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenRaw}
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 h-8 px-2 sm:px-2.5 rounded-lg text-xs"
            title="Open Document Directly in New Tab"
          >
            <ExternalLink className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Open Raw</span>
          </Button>

          {/* Download Original */}
          <Button
            onClick={handleDownload}
            size="sm"
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-8 px-2.5 sm:px-3 rounded-lg shadow-md shadow-accent/20 text-xs"
          >
            <Download className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </header>

      {/* Main Preview Viewport: Fills 100% of remaining screen height */}
      <main className={`flex-1 w-full min-h-0 flex flex-col overflow-hidden transition-all duration-200 ${
        isEdgeToEdge ? "p-0" : "p-1.5 sm:p-3 md:p-4"
      }`}>
        <div className={`flex-1 w-full h-full min-h-0 bg-slate-900 flex flex-col overflow-hidden relative ${
          isEdgeToEdge ? "rounded-none border-0" : "rounded-xl border border-slate-800 shadow-2xl"
        }`}>
          {canPreview ? (
            isImage ? (
              <div className="flex-1 w-full h-full min-h-0 overflow-auto flex items-center justify-center p-4 bg-slate-950/60">
                <img
                  src={previewUrl}
                  alt={document.originalName}
                  style={{
                    transform: `scale(${imgScale}) rotate(${imgRotation}deg)`,
                    transition: "transform 0.2s ease-out",
                    maxWidth: imgScale === 1 ? "100%" : "none",
                    maxHeight: imgScale === 1 ? "100%" : "none",
                  }}
                  className="object-contain select-none shadow-xl rounded"
                />
              </div>
            ) : (
              /* PDF Viewer: Full 100% width and height */
              <iframe
                src={`${previewUrl}#view=FitH`}
                className="w-full h-full flex-1 min-h-0 border-0 bg-white block"
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "100%",
                  border: "none",
                }}
                title={document.originalName}
              />
            )
          ) : (
            <div className="flex-1 w-full h-full min-h-0 flex flex-col items-center justify-center p-8 text-center bg-slate-950/80">
              <div className="h-20 w-20 bg-slate-800/70 border border-slate-700/60 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
                <FileText className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Browser Preview Unavailable</h3>
              <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
                This document format ({document.mimeType || "binary"}) cannot be rendered directly in the embedded viewer. Download the file to view it in full fidelity on your device.
              </p>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleDownload}
                  size="default"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 font-semibold"
                >
                  <Download className="mr-2 h-4 w-4" /> Download File ({formatBytes(document.fileSize)})
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
