import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useDocuments } from "@/hooks/use-documents";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DocumentTable } from "@/components/documents/document-table";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: documents, isLoading } = useDocuments();

  // Basic stats computation
  const totalFiles = documents?.length || 0;
  const totalStorageBytes = documents?.reduce((acc, doc) => acc + Number(doc.fileSize), 0) || 0;
  
  // Format to roughly GB for visualization if wanted, here we just show count
  const storageGB = (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2);

  return (
    <DashboardLayout>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.username}
          </h1>
          <p className="text-lg text-slate-500 mt-2">
            Manage your secure files and organizational assets.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-2xl premium-shadow border border-slate-100">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Documents</p>
            <p className="text-3xl font-display font-bold text-primary">{totalFiles}</p>
          </div>
          <div className="bg-card p-6 rounded-2xl premium-shadow border border-slate-100">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Storage Used</p>
            <p className="text-3xl font-display font-bold text-primary">
              {Number(storageGB) > 0 ? `${storageGB} GB` : `${(totalStorageBytes / (1024 * 1024)).toFixed(2)} MB`}
            </p>
          </div>
          <div className="bg-gradient-to-br from-accent to-accent/80 p-6 rounded-2xl premium-shadow text-white relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-1">System Status</p>
              <p className="text-3xl font-display font-bold">Secure</p>
            </div>
            {/* abstract shape */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        </div>

        {/* Document list */}
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">Recent Files</h2>
          <DocumentTable documents={documents} isLoading={isLoading} />
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
