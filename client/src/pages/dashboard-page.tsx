import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useDocuments } from "@/hooks/use-documents";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DocumentTable } from "@/components/documents/document-table";
import { Shield, TrendingUp, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: documents, isLoading } = useDocuments();

  const totalFiles = documents?.length || 0;
  const totalStorageBytes = documents?.reduce((acc, doc) => acc + Number(doc.fileSize), 0) || 0;

  const storageGB = (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(1);
  const storageMB = (totalStorageBytes / (1024 * 1024)).toFixed(1);
  const storageDisplay = Number(storageGB) >= 0.1 ? `${storageGB} GB` : `${storageMB} MB`;
  const storagePercent = Math.min((totalStorageBytes / (10 * 1024 * 1024 * 1024)) * 100, 100);

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard</h1>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              className="rounded-lg border-slate-300 text-slate-700 font-medium hover:bg-slate-50 px-5"
            >
              Generate Report
            </Button>
            <Button
              className="rounded-lg font-semibold px-5 text-sm"
              style={{ backgroundColor: '#c9a84c', color: '#fff' }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Document
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Documents */}
          <div className="bg-white rounded-xl p-6 border border-slate-200" style={{ borderTop: '3px solid #c9a84c' }}>
            <p className="text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: '#c9a84c' }}>
              Total Documents
            </p>
            <div className="flex items-baseline space-x-3">
              <span className="text-4xl font-display font-bold text-slate-900">
                {totalFiles.toLocaleString()}
              </span>
              <span className="flex items-center text-sm font-medium text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                12%
              </span>
            </div>
          </div>

          {/* Storage Used */}
          <div className="bg-white rounded-xl p-6 border border-slate-200" style={{ borderTop: '3px solid #c9a84c' }}>
            <p className="text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: '#c9a84c' }}>
              Storage Used
            </p>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-display font-bold text-slate-900">{storageDisplay}</span>
              <span className="text-sm text-slate-400 font-medium">/ 10 GB</span>
              <span className="flex items-center text-sm font-medium text-emerald-600 ml-2">
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                5%
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(storagePercent, 2)}%`,
                  backgroundColor: '#c9a84c',
                }}
              />
            </div>
          </div>
        </div>

        {/* Recent Documents */}
        <div>
          <DocumentTable documents={documents} isLoading={isLoading} />
        </div>

        {/* Vault Protection Banner */}
        <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-6 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-800 mb-2">
              Vault Protection
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              Your data is secured with AES-256 encryption. We utilize advanced zero-knowledge
              architecture to ensure only authorized entities can access sensitive materials. Last
              integrity check performed 4 minutes ago.
            </p>
          </div>
          <Button
            variant="outline"
            className="flex-shrink-0 ml-6 rounded-lg border-slate-300 text-slate-600 font-medium hover:bg-white"
          >
            <Shield className="mr-2 h-4 w-4" style={{ color: '#c9a84c' }} />
            Security Log
          </Button>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
