import { useState } from "react";
import { Link } from "wouter";
import { MoreVertical, Eye, Download, Trash2, FileText, Search, FileSpreadsheet, FileArchive, File } from "lucide-react";
import { type Document } from "@shared/schema";
import { formatBytes } from "@/lib/format";
import { buildUrl, api } from "@shared/routes";
import { useDeleteDocument } from "@/hooks/use-documents";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface DocumentTableProps {
  documents?: Document[];
  isLoading: boolean;
}

function getFileTypeInfo(mimeType: string, fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (mimeType.includes('pdf') || ext === 'pdf') {
    return { label: 'PDF Document', color: '#ef4444', bgColor: '#fef2f2', Icon: FileText };
  }
  if (mimeType.includes('word') || mimeType.includes('document') || ext === 'docx' || ext === 'doc') {
    return { label: 'MS Word', color: '#3b82f6', bgColor: '#eff6ff', Icon: FileText };
  }
  if (mimeType.includes('sheet') || mimeType.includes('excel') || ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    return { label: 'Spreadsheet', color: '#22c55e', bgColor: '#f0fdf4', Icon: FileSpreadsheet };
  }
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed') || ext === 'zip' || ext === 'rar' || ext === 'tar' || ext === 'gz') {
    return { label: 'Archive', color: '#f59e0b', bgColor: '#fffbeb', Icon: FileArchive };
  }
  if (mimeType.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
    return { label: 'Image', color: '#8b5cf6', bgColor: '#f5f3ff', Icon: File };
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || ext === 'pptx' || ext === 'ppt') {
    return { label: 'Presentation', color: '#f97316', bgColor: '#fff7ed', Icon: FileText };
  }
  if (mimeType.includes('text') || ext === 'txt' || ext === 'md') {
    return { label: 'Text File', color: '#6b7280', bgColor: '#f9fafb', Icon: FileText };
  }
  return { label: 'File', color: '#6b7280', bgColor: '#f9fafb', Icon: File };
}

function formatTableDate(date: string | Date | null | undefined) {
  if (!date) return "N/A";
  return format(new Date(date), "MMM dd, yyyy");
}

export function DocumentTable({ documents, isLoading }: DocumentTableProps) {
  const [search, setSearch] = useState("");
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const deleteMutation = useDeleteDocument();

  const filteredDocs = documents?.filter(doc =>
    doc.originalName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleDownload = (doc: Document) => {
    const url = buildUrl(api.documents.download.path, { id: doc.id });
    window.open(url, '_blank');
  };

  const confirmDelete = () => {
    if (docToDelete) {
      deleteMutation.mutate(docToDelete.id, {
        onSuccess: () => setDocToDelete(null)
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-10 w-56 rounded-lg" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center px-6 py-4 border-b border-slate-100">
              <Skeleton className="h-9 w-9 rounded-lg mr-4" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-4 w-20 mr-8" />
              <Skeleton className="h-4 w-16 mr-8" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-slate-900">Recent Documents</h2>
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Filter documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-lg bg-white border-slate-200 text-sm focus-visible:ring-amber-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="h-16 w-16 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-base font-display font-semibold text-slate-900 mb-1">No documents found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {search
                ? "No files matching your search. Try adjusting your terms."
                : "Your vault is empty. Upload your first document to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-[0.1em] text-slate-500">Name</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-[0.1em] text-slate-500">Type</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-[0.1em] text-slate-500">Size</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-[0.1em] text-slate-500">Uploaded</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-[0.1em] text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => {
                  const fileType = getFileTypeInfo(doc.mimeType, doc.originalName);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: fileType.bgColor }}
                          >
                            <fileType.Icon className="h-[18px] w-[18px]" style={{ color: fileType.color }} />
                          </div>
                          <Link href={`/d/${doc.id}`}>
                            <span className="font-medium text-sm hover:underline cursor-pointer line-clamp-1 max-w-[250px]" style={{ color: '#1a5276' }}>
                              {doc.originalName}
                            </span>
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {fileType.label}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {formatBytes(doc.fileSize)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {formatTableDate(doc.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4 text-slate-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-xl border-slate-100">
                            <Link href={`/d/${doc.id}`}>
                              <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2">
                                <Eye className="mr-2 h-4 w-4 text-slate-500" />
                                <span className="font-medium">Preview</span>
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem
                              onClick={() => handleDownload(doc)}
                              className="cursor-pointer rounded-lg px-3 py-2"
                            >
                              <Download className="mr-2 h-4 w-4 text-slate-500" />
                              <span className="font-medium">Download</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem
                              onClick={() => setDocToDelete(doc)}
                              className="cursor-pointer rounded-lg px-3 py-2 text-red-600 focus:text-red-700 focus:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span className="font-medium">Delete Permanently</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">Delete Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-500">
              This will permanently delete <span className="font-semibold text-slate-900">"{docToDelete?.originalName}"</span> from your vault. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-xl font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700 rounded-xl font-semibold shadow-md shadow-red-600/20"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
