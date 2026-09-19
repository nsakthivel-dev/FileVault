import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Search, 
  Download, 
  FileText, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Filter
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAuditLogs, useDashboardStats, useDocuments } from "@/hooks/use-documents";
import { formatAuditLog } from "@/lib/audit-formatter";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth-headers";
import { api } from "@shared/routes";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: auditLogs, isLoading: isLoadingAudit } = useAuditLogs({ all: true });
  const { data: documents } = useDocuments();
  const { data: stats } = useDashboardStats();

  // Read URL query params (?tab=audit or ?tab=security)
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "audit" || tabParam === "security") {
        return "Security";
      }
    }
    return "Profile";
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "audit" || tabParam === "security") {
        setActiveTab("Security");
      }
    };
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  // Audit tab states
  const [auditSearch, setAuditSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "upload" | "share" | "delete" | "view" | "security">("all");

  const formattedLogs = useMemo(() => {
    if (!auditLogs || !Array.isArray(auditLogs)) return [];
    return auditLogs.map((log) => ({
      raw: log,
      formatted: formatAuditLog(log),
    }));
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    let list = formattedLogs;

    if (categoryFilter !== "all") {
      list = list.filter((item) => {
        if (categoryFilter === "upload") return item.formatted.category === "upload";
        if (categoryFilter === "share") return item.formatted.category === "share";
        if (categoryFilter === "delete") return item.formatted.category === "delete";
        if (categoryFilter === "view") return item.formatted.category === "view";
        if (categoryFilter === "security") return item.formatted.category === "security" || item.formatted.category === "system";
        return true;
      });
    }

    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase().trim();
      list = list.filter((item) => 
        item.formatted.sentence.toLowerCase().includes(q) ||
        item.formatted.documentName.toLowerCase().includes(q) ||
        item.formatted.actionTitle.toLowerCase().includes(q) ||
        (item.raw.documentName && item.raw.documentName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [formattedLogs, categoryFilter, auditSearch]);

  const handleExportAudit = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${api.auditLogs.list.path}?all=true`, { credentials: "include", headers });
      const fullLogs = res.ok ? await res.json() : (auditLogs || []);
      const enrichedLogs = (Array.isArray(fullLogs) ? fullLogs : []).map((l: any) => ({
        ...l,
        formattedActivity: formatAuditLog(l).sentence,
      }));
      const logData = JSON.stringify(enrichedLogs, null, 2);
      const blob = new Blob([logData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `filevault_audit_trail_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Audit Trail Exported",
        description: "Security and activity logs downloaded successfully.",
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "Failed to download audit logs.",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { label: "Profile", icon: User },
    { label: "Security", icon: Shield, badge: "Audit Trail" },
    { label: "Storage", icon: Database },
    { label: "Notifications", icon: Bell },
    { label: "Preferences", icon: Settings },
  ];

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
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your account credentials, security preferences, and view complete audit history.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="space-y-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveTab(item.label)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className={`h-4 w-4 ${isActive ? "text-[#c9a84c]" : ""}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/60">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Settings Content */}
          <div className="md:col-span-3 space-y-6">
            {/* TAB: SECURITY & AUDIT TRAIL */}
            {activeTab === "Security" && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-slate-800" />
                      <h3 className="text-lg font-display font-bold text-slate-900">Activity Audit Trail</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Immutable record of all document actions, file uploads, secure shares, and access events.
                    </p>
                  </div>
                  <button
                    onClick={handleExportAudit}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export Audit Trail</span>
                  </button>
                </div>

                {/* Filters & Search Bar */}
                <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search activity by document or recipient..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-slate-800 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {[
                      { id: "all", label: "All Events" },
                      { id: "upload", label: "Uploads" },
                      { id: "share", label: "Shares" },
                      { id: "delete", label: "Trash & Delete" },
                      { id: "view", label: "Access & Views" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryFilter(cat.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                          categoryFilter === cat.id
                            ? "bg-slate-900 text-white font-semibold"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audit List */}
                <div className="divide-y divide-slate-100">
                  {isLoadingAudit ? (
                    <div className="py-16 text-center">
                      <div className="h-8 w-8 mx-auto rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin mb-2" />
                      <p className="text-xs text-slate-500 font-medium">Loading audit history...</p>
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="h-12 w-12 mx-auto rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-3">
                        <FileText className="h-6 w-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-700">No activity records found</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        {auditSearch.trim()
                          ? `No activity matching "${auditSearch}". Try clearing search filters.`
                          : "Activity events such as uploads, shares, and deletions will be listed here."}
                      </p>
                    </div>
                  ) : (
                    filteredLogs.map((item) => {
                      const { raw, formatted } = item;
                      const timeAgo = (() => {
                        try {
                          return formatDistanceToNow(new Date(raw.timestamp), { addSuffix: true });
                        } catch {
                          return "Recently";
                        }
                      })();

                      const formattedDate = (() => {
                        try {
                          return format(new Date(raw.timestamp), "MMM d, yyyy • h:mm a");
                        } catch {
                          return "";
                        }
                      })();

                      return (
                        <div
                          key={raw.id}
                          className="p-4 sm:px-6 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors text-xs"
                        >
                          <div className="flex items-start space-x-3.5 min-w-0">
                            <span className={`h-2.5 w-2.5 rounded-full ${formatted.dotColor} shrink-0 mt-1 shadow-xs`} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-900 leading-snug break-words">
                                {formatted.sentence}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${formatted.badgeColor}`}>
                                  {formatted.actionTitle}
                                </span>
                                {formattedDate && (
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {formattedDate}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 block mb-1">
                              {raw.status === "SUCCESS" || !raw.status ? "Completed" : raw.status}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {timeAgo}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === "Profile" && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-display font-bold text-slate-900">Profile Information</h3>
                  <p className="text-sm text-slate-500">Your account identity and cryptographic vault credentials.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center space-x-4 pb-6 border-b border-slate-100">
                    <div className="h-16 w-16 rounded-full bg-slate-950 text-white font-bold text-xl flex items-center justify-center shadow-xs border-2 border-slate-100">
                      {(user?.username || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-base">{user?.username || "User"}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email || "No email linked"}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 mt-2">
                        Active Enterprise Vault
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-slate-400 font-mono text-[10px] uppercase block mb-1">Account ID</span>
                      <span className="font-mono text-slate-800 font-semibold">{user?.id || "N/A"}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-slate-400 font-mono text-[10px] uppercase block mb-1">Total Vaulted Documents</span>
                      <span className="font-mono text-slate-800 font-semibold">{documents?.length ?? 0} files</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: STORAGE */}
            {activeTab === "Storage" && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-display font-bold text-slate-900">Storage Architecture</h3>
                  <p className="text-sm text-slate-500">Secure storage allocation and persistent manifest sync.</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-2">
                      <span>Vault Quota (10 GB)</span>
                      <span>{documents?.length ?? 0} vaulted files</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-900 rounded-full" style={{ width: "3%" }} />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Storage Engine</span>
                      <span className="font-semibold text-slate-800">Supabase Cloud + Local Cache</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Encryption Standard</span>
                      <span className="font-semibold text-slate-800">AES-256-GCM + SHA-256</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Retention</span>
                      <span className="font-semibold text-slate-800">30-day soft trash retention</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS & PREFERENCES */}
            {(activeTab === "Notifications" || activeTab === "Preferences") && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-display font-bold text-slate-900">{activeTab}</h3>
                  <p className="text-sm text-slate-500">Configure your system preferences.</p>
                </div>
                <div className="p-6 space-y-6 text-center py-16">
                  <div className="h-12 w-12 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-dashed border-slate-300">
                    <Settings className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">{activeTab} Configured by Policy</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Enterprise vault security policies manage {activeTab.toLowerCase()} automatically.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
