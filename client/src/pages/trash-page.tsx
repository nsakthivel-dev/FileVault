import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useTrashDocuments, useRestoreDocument, usePermanentDeleteDocument, useEmptyTrash } from "@/hooks/use-documents";
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  ShieldAlert, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

export default function TrashPage() {
  const { data: trashDocs = [], isLoading } = useTrashDocuments();
  const restoreMutation = useRestoreDocument();
  const permanentDeleteMutation = usePermanentDeleteDocument();
  const emptyTrashMutation = useEmptyTrash();

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-display">
                Trash Bin
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                30-Day Retention
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Files removed from your vault are safely held for 30 days before permanent cryptographic erasure. You can restore them anytime.
            </p>
          </div>

          {trashDocs.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={emptyTrashMutation.isPending}
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-9 text-xs font-semibold"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Empty Trash
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-slate-900">Empty Trash Bin?</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-slate-500">
                    This will permanently delete all {trashDocs.length} items in the trash bin along with their cryptographic anchors. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => emptyTrashMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs"
                  >
                    Yes, Permanently Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* 30-Day Policy Alert */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start space-x-3">
          <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Automated 30-Day Protection Window:</span> Documents moved to the trash remain isolated and encrypted in your dedicated storage folder. After 30 days from deletion, our automated retention routine permanently deletes the physical data and revokes all share links.
          </div>
        </div>

        {/* Trash Records Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Pending Deletions ({trashDocs.length})
            </h3>
            <span className="text-xs text-slate-400">
              Auto-purges when remaining days reaches 0
            </span>
          </div>

          {trashDocs.length === 0 ? (
            <div className="p-16 text-center">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">Your Trash is Clean</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No deleted documents are currently in the 30-day retention queue.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Moved to Trash</th>
                    <th className="py-3 px-4">Retention Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trashDocs.map((doc) => {
                    const daysRemaining = doc.daysRemaining ?? 30;
                    return (
                      <motion.tr 
                        key={doc.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* File */}
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center space-x-2.5">
                            <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-xs text-slate-900 max-w-[240px]" title={doc.originalName}>
                                {doc.originalName}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[240px]">
                                {doc.storagePath.split("/").pop() || doc.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 font-mono">
                            {doc.documentType}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {formatBytes(Number(doc.fileSize) || 0)}
                        </td>

                        {/* Deleted Date */}
                        <td className="py-3.5 px-4 text-slate-500">
                          {doc.deletedAt ? format(new Date(doc.deletedAt), "MMM d, yyyy") : "Recently"}
                        </td>

                        {/* Retention Days Remaining */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            daysRemaining <= 3 
                              ? "bg-red-50 text-red-700 border border-red-200 animate-pulse" 
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}>
                            <Clock className="h-3 w-3" />
                            <span>{daysRemaining} days remaining</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Restore */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => restoreMutation.mutate(doc.id)}
                              disabled={restoreMutation.isPending}
                              className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
                              title="Restore file back to Vault"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restore
                            </Button>

                            {/* Delete Permanently */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                  title="Permanently Delete Now"
                                >
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-slate-900">Delete Permanently?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-xs text-slate-500">
                                    Are you sure you want to permanently erase <span className="font-semibold text-slate-800">"{doc.originalName}"</span>? This will immediately purge the file and all cryptographic proof keys from storage.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => permanentDeleteMutation.mutate(doc.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs"
                                  >
                                    Yes, Purge File
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
