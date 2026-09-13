import { ReactNode, useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Sidebar } from "./sidebar";
import { UploadModal } from "../documents/upload-modal";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications, useMarkNotificationRead } from "@/hooks/use-documents";
import { 
  Bell, 
  Menu, 
  Search, 
  Clock, 
  ShieldCheck, 
  ChevronRight 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export function DashboardLayout({ children, onOpenUpload }: { children: ReactNode; onOpenUpload?: () => void }) {
  const [location] = useLocation();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const { user } = useAuth();

  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();

  const unreadCount = (notifications || []).filter((n) => !n.read).length;
  const username = user?.name || user?.username?.split("@")[0] || "sakthi";

  const breadcrumbText = 
    location === "/" || location === "/dashboard"
      ? "Dashboard"
      : location === "/documents" 
      ? "Documents" 
      : location === "/recent"
      ? "Recent Files"
      : location === "/shared" || location === "/shared-links"
      ? "Shared Links"
      : location === "/trash"
      ? "Trash Bin"
      : location === "/settings" 
      ? "Settings" 
      : "Vault";

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <Sidebar
        onOpenUpload={() => setIsUploadOpen(true)}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isDesktop={isDesktop}
      />
      {isSidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex-shrink-0 lg:px-7 z-10">
          {/* Left: Mobile Toggle + Breadcrumbs + Enclave Badge */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {!isDesktop && (
              <button
                className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            {/* Breadcrumb navigation */}
            <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
              <Link href="/" className="hover:text-slate-900 transition-colors">Vault</Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold">{breadcrumbText}</span>
            </div>

            {/* Enclave active pill badge */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>FIPS 140-2 Enclave Active</span>
            </div>
          </div>

          {/* Right: Search + Icons + User Avatar */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Search Input */}
            <div className="relative hidden md:block w-64 lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents or hashes..."
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200/90 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-slate-400 bg-white border border-slate-200 px-1 py-0.5 rounded shadow-2xs">
                ⌘K
              </kbd>
            </div>

            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2 shadow-2xl border-slate-100">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Security Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <DropdownMenuSeparator className="bg-slate-100" />

                {(!notifications || notifications.length === 0) ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No active notifications
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.read && markRead.mutate(n.id)}
                        className={`p-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                          n.read ? "bg-white hover:bg-slate-50 opacity-70" : "bg-amber-50/50 hover:bg-amber-50 border border-amber-100"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-semibold text-slate-800">{n.title}</span>
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(n.createdAt), "MMM d")}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 leading-snug">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Audit History Clock */}
            <Link href="/settings?tab=audit">
              <button 
                title="View Audit Trail"
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
              >
                <Clock className="h-4 w-4" />
              </button>
            </Link>

            {/* User Profile Pill */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="h-7 w-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-800 hidden sm:inline">{username}</span>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-7 bg-[#f8fafc]">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </div>
  );
}
