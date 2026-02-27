import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CloudUpload, File, X, Loader2 } from "lucide-react";
import { useUploadDocument } from "@/hooks/use-documents";
import { formatBytes } from "@/lib/format";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const upload = useUploadDocument();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024 // 50MB max
  });

  const handleUpload = () => {
    if (!selectedFile) return;
    upload.mutate(selectedFile, {
      onSuccess: () => {
        setSelectedFile(null);
        onClose();
      }
    });
  };

  const handleClose = () => {
    if (upload.isPending) return;
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <div className="p-6 bg-white">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-display font-bold">Secure Upload</DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              Drag and drop your document to store it securely in your vault.
            </DialogDescription>
          </DialogHeader>

          {!selectedFile ? (
            <div 
              {...getRootProps()} 
              className={`
                border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
                ${isDragActive ? 'border-accent bg-accent/5 scale-[0.99]' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
              `}
            >
              <input {...getInputProps()} />
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <CloudUpload className={`h-8 w-8 ${isDragActive ? 'text-accent' : 'text-slate-400'}`} />
              </div>
              <p className="text-base font-semibold text-slate-700 mb-1">
                {isDragActive ? "Drop your file here" : "Click or drag file to this area"}
              </p>
              <p className="text-sm text-slate-400">Maximum file size: 50MB</p>
            </div>
          ) : (
            <div className="border rounded-xl p-4 bg-slate-50 relative overflow-hidden">
              {upload.isPending && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 text-accent animate-spin" />
                </div>
              )}
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <File className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatBytes(selectedFile.size)}</p>
                </div>
                <button 
                  onClick={() => setSelectedFile(null)}
                  disabled={upload.isPending}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end space-x-3">
            <Button variant="ghost" onClick={handleClose} disabled={upload.isPending} className="font-medium">
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || upload.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 font-semibold shadow-md rounded-lg"
            >
              {upload.isPending ? "Encrypting & Uploading..." : "Upload Document"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
