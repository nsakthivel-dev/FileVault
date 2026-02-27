import { useState } from "react";
import { Link } from "wouter";
import { MoreVertical, Eye, Download, Trash2, FileText, Search, ShieldCheck } from "lucide-react";
import { type Document } from "@shared/schema";
import { formatBytes, formatDate } from "@/lib/format";
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

interface DocumentTableProps {
  documents?: Document[];
  isLoading: boolean;
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
          <Skeleton className="h-10 w-64 rounded-xl" />
        </div>
        <div className="bg-card rounded-2xl premium-shadow border border-slate-100 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center p-4 border-b border-slate-50">
              <Skeleton className="h-10 w-10 rounded-lg mr-4" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Search vault..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-accent"
          />
        </div>
        <div className="flex items-center space-x-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
          <ShieldCheck className="h-4 w-4 mr-1.5" />
          End-to-End Encrypted
        </div>
      </div>

      <div className="bg-card rounded-2xl premium-shadow border border-slate-100 overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="h-20 w-20 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-display font-semibold text-slate-900 mb-2">No documents found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              {search 
                ? "We couldn't find any files matching your search query. Try adjusting your terms." 
                : "Your vault is empty. Upload your first document to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 font-medium text-sm text-slate-500">Name</th>
                  <th className="px-6 py-4 font-medium text-sm text-slate-500">Size</th>
                  <th className="px-6 py-4 font-medium text-sm text-slate-500">Type</th>
                  <th className="px-6 py-4 font-medium text-sm text-slate-500">Uploaded</th>
                  <th className="px-6 py-4 font-medium text-sm text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0 text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 line-clamp-1 max-w-[250px]">{doc.originalName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {formatBytes(doc.fileSize)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium uppercase tracking-wider">
                        {doc.mimeType.split('/')[1] || 'FILE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {formatDate(doc.createdAt)}
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
                ))}
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
