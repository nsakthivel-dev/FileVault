import { Link, useLocation } from "wouter";
import { 
  ShieldCheck, 
  LayoutDashboard, 
  FileText, 
  Clock, 
  Share2, 
  Trash2, 
  Plus, 
  Pin,
  LogOut, 
  X,
  FileCheck2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDocuments, useDashboardStats, useUserShares, useTrashDocuments } from "@/hooks/use-documents";
import { motion } from "framer-motion";

export function Sidebar({
  onOpenUpload,
  isSidebarOpen,
  setIsSidebarOpen,
  isDesktop,
}: {
  onOpenUpload: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isDesktop: boolean;
}) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { data: documents } = useDocuments();
  const { data: userShares } = useUserShares();
  const { data: trashDocs } = useTrashDocuments();

  const totalFiles = documents?.length ?? 0;
  const pinnedDocs = documents?.filter((d) => Boolean(d.isPinned)) ?? [];
  const resumesCount = documents?.filter((d) => (d.documentType || "").toLowerCase() === "resume").length ?? 0;
  const certificatesCount = documents?.filter((d) => 
    ["certificate", "certificates", "professional"].includes((d.documentType || "").toLowerCase())
  ).length ?? 0;
  const hackathonsCount = documents?.filter((d) => 
    ["hackathon", "achievement", "award", "awards"].includes((d.documentType || "").toLowerCase())
  ).length ?? 0;
  const sharedCount = userShares?.length ?? 0;
  const trashCount = trashDocs?.length ?? 0;

  const totalBytes = documents?.reduce((acc, d) => acc + Number(d.fileSize || 0), 0) || 0;
  const storageMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const storagePercent = totalBytes === 0 ? "0.00" : Math.max((totalBytes / (10 * 1024 * 1024 * 1024)) * 100, 0.01).toFixed(2);

  const username = user?.name || user?.username?.split("@")[0] || "sakthi";

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ x: isDesktop ? 0 : isSidebarOpen ? 0 : "-100%" }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-y-0 left-0 w-64 flex flex-col h-screen z-40 bg-[#fbfcfd] border-r border-slate-200/80 shadow-xs lg:sticky lg:translate-x-0 select-none"
      >
        {/* Workspace Brand Selector */}
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-slate-950 flex items-center justify-center text-white shrink-0 shadow-xs">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-slate-900 tracking-tight leading-tight">Document Vault</h2>
                <p className="text-[11px] text-slate-400 truncate">{username} / enterprise</p>
              </div>
            </div>
          </div>

          {!isDesktop && (
            <button
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
          {/* VAULT SECTION */}
          <div>
            <div className="px-3 pb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              VAULT
            </div>
            <nav className="space-y-0.5">
              {/* 1. Dashboard (Renamed from All Documents) */}
              <Link
                href="/"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  location === "/"
                    ? "bg-slate-950 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <LayoutDashboard className={`h-4 w-4 ${location === "/" ? "text-white" : "text-slate-400"}`} />
                  <span>Dashboard</span>
                </div>
                <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono ${
                  location === "/"
                    ? "bg-slate-800 text-slate-200"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {totalFiles}
                </span>
              </Link>

              {/* 2. Documents (Renamed from Starred) */}
              <Link
                href="/documents"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  location === "/documents"
                    ? "bg-slate-950 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className={`h-4 w-4 ${location === "/documents" ? "text-white" : "text-slate-400"}`} />
                  <span>Documents</span>
                </div>
                <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono ${
                  location === "/documents"
                    ? "bg-slate-800 text-slate-200"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {totalFiles}
                </span>
              </Link>

              {/* 3. Recent Files */}
              <Link
                href="/recent"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  location === "/recent"
                    ? "bg-slate-950 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <Clock className={`h-4 w-4 ${location === "/recent" ? "text-white" : "text-slate-400"}`} />
                <span>Recent Files</span>
              </Link>

              {/* 4. Shared Links */}
              <Link
                href="/shared"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  location === "/shared"
                    ? "bg-slate-950 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Share2 className={`h-4 w-4 ${location === "/shared" ? "text-white" : "text-slate-400"}`} />
                  <span>Shared Links</span>
                </div>
                {sharedCount > 0 && (
                  <span className={`text-[11px] px-2 py-0.2 rounded-full font-mono ${
                    location === "/shared" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"
                  }`}>
                    {sharedCount}
                  </span>
                )}
              </Link>

              {/* 5. Trash (30-day retention) */}
              <Link
                href="/trash"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  location === "/trash"
                    ? "bg-slate-950 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Trash2 className={`h-4 w-4 ${location === "/trash" ? "text-white" : "text-slate-400"}`} />
                  <span>Trash</span>
                </div>
                {trashCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {trashCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>

          {/* PIN QUICK ACCESS (Renamed from Collections) */}
          <div>
            <div className="px-3 pb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center space-x-1.5">
                <Pin className="h-3 w-3 text-slate-400" />
                <span>PIN QUICK ACCESS</span>
              </span>
              <button
                onClick={() => {
                  onOpenUpload();
                  setIsSidebarOpen(false);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Upload new file"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <nav className="space-y-0.5">
              {/* Resumes & CVs */}
              <Link
                href="/documents?category=resume"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <span>Resumes & CVs</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{resumesCount}</span>
              </Link>

              {/* Certificates */}
              <Link
                href="/documents?category=certificate"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Certificates</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{certificatesCount}</span>
              </Link>

              {/* Hackathon & Proofs */}
              <Link
                href="/documents?category=achievement"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span>Hackathon & Proofs</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{hackathonsCount}</span>
              </Link>

              {/* Pinned Documents dynamically */}
              {pinnedDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents?id=${doc.id}`}
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all group"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                    <span className="truncate">{doc.originalName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 uppercase">{doc.documentType}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Storage & KMS Widget */}
        <div className="p-3 border-t border-slate-200/80">
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Storage Allocation</span>
              <span className="font-mono text-slate-900 font-bold">{storagePercent}%</span>
            </div>

            {/* Slider bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-900 rounded-full transition-all duration-500"
                style={{ width: `${totalBytes === 0 ? 0 : Math.min(Math.max(Number(storagePercent), 2), 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>{storageMB} MB used</span>
              <span>10.0 GB</span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-800 text-[11px]">KMS Enclave</span>
              </div>
              <button
                onClick={() => logout.mutate()}
                title="Sign Out"
                className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
