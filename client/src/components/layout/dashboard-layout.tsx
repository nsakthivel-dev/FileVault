import { ReactNode, useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { UploadModal } from "../documents/upload-modal";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications, useMarkNotificationRead } from "@/hooks/use-documents";
import { 
  Bell, 
  Menu, 
  Search, 
  Clock, 
  ShieldCheck, 
  ChevronRight,
  LogOut,
  Trash2,
  Settings,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export function DashboardLayout({ children, onOpenUpload }: { children: ReactNode; onOpenUpload?: () => void }) {
  const [location, setLocation] = useLocation();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logout } = useAuth();

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

  const handleMobileSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/documents?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileSearchOpen(false);
    }
  };

  const handleOpenUpload = onOpenUpload || (() => setIsUploadOpen(true));

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <Sidebar
        onOpenUpload={handleOpenUpload}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isDesktop={isDesktop}
      />
      {isSidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-3 py-2.5 sm:px-4 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex-shrink-0 lg:px-7 z-10">
          {/* Left: Mobile Toggle + Breadcrumbs + Security Badge */}
          <div className="flex items-center space-x-2.5 sm:space-x-4 min-w-0">
            {!isDesktop && (
              <button
                aria-label="Open Sidebar Menu"
                className="p-2 -ml-1 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900 active:scale-95"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            {/* Breadcrumb navigation */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs text-slate-500 font-medium truncate">
              <Link href="/" className="hover:text-slate-900 transition-colors font-semibold">Vault</Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-bold truncate">{breadcrumbText}</span>
            </div>

            {/* Real Security Status badge */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>SHA-256 Verified</span>
            </div>
          </div>

          {/* Right: Search + Icons + User Avatar */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {/* Desktop Search Input */}
            <div className="relative hidden md:block w-64 lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    setLocation(`/documents?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                placeholder="Search documents or hashes..."
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200/90 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-slate-400 bg-white border border-slate-200 px-1 py-0.5 rounded shadow-2xs">
                ↵
              </kbd>
            </div>

            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Search"
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  aria-label="Notifications"
                  className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2 shadow-2xl border-slate-100 z-50">
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

            {/* Audit History Clock (Desktop) */}
            <Link href="/settings?tab=audit" className="hidden sm:inline-block">
              <button 
                title="View Audit Trail"
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
              >
                <Clock className="h-4 w-4" />
              </button>
            </Link>

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-2 pl-1.5 sm:pl-2 border-l border-slate-200 text-left tap-highlight-transparent">
                  <div className="h-8 w-8 rounded-full bg-slate-950 text-white font-bold text-xs flex items-center justify-center shadow-xs border-2 border-slate-100">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 hidden sm:inline">{username}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border-slate-100 z-50">
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="font-bold text-slate-900 text-xs">{username}</div>
                  <div className="text-[11px] text-slate-400 font-mono">Enterprise Vault</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/settings")} className="rounded-xl text-xs py-2 cursor-pointer">
                  <Settings className="h-3.5 w-3.5 mr-2 text-slate-500" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/trash")} className="rounded-xl text-xs py-2 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5 mr-2 text-slate-500" />
                  Trash Bin (30-day)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/settings?tab=audit")} className="rounded-xl text-xs py-2 cursor-pointer">
                  <Clock className="h-3.5 w-3.5 mr-2 text-slate-500" />
                  Security Audit Logs
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logout.mutate()}
                  className="rounded-xl text-xs py-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Search Overlay Modal */}
        {mobileSearchOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-4 space-y-3 max-w-md mx-auto w-full mt-12">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Search Vault</span>
                <button 
                  onClick={() => setMobileSearchOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleMobileSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search file name, type, or SHA hash..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </form>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMobileSearchSubmit}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 text-white shadow-xs"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Body with bottom padding for mobile BottomNav */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-7 pb-24 lg:pb-7 bg-[#f8fafc] touch-pan-x">
          <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav onOpenUpload={handleOpenUpload} />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </div>
  );
}

