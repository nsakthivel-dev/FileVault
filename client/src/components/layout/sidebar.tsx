import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, CloudUpload, Settings, LogOut, Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function Sidebar({ onOpenUpload, isSidebarOpen, setIsSidebarOpen, isDesktop }: { onOpenUpload: () => void; isSidebarOpen: boolean; setIsSidebarOpen: (isOpen: boolean) => void; isDesktop: boolean }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    { label: "Documents", icon: FileText, href: "/" },
    { label: "Upload", icon: CloudUpload, onClick: onOpenUpload },
    { label: "Settings", icon: Settings, href: "/settings" },
  ];

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ x: isDesktop ? 0 : (isSidebarOpen ? 0 : "-100%") }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed inset-y-0 left-0 w-60 flex flex-col h-screen z-40 lg:sticky lg:translate-x-0"
        style={{ backgroundColor: '#1a2332' }}
      >
        {/* Branding */}
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <h1 className="text-white font-display font-bold text-lg tracking-tight leading-tight">
            Document Vault
          </h1>
          {!isDesktop && (
            <button
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase mt-0.5 px-5" style={{ color: '#c9a84c' }}>
          Enterprise Edition
        </p>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = 'href' in item && location === item.href;

            const content = (
              <>
                <item.icon className="h-[18px] w-[18px]" style={isActive ? { color: '#c9a84c' } : {}} />
                <span>{item.label}</span>
              </>
            );

            if ('onClick' in item) {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    onOpenUpload();
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${isActive
                  ? "bg-white/10 text-white font-semibold"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 space-y-2">
          <Button
            onClick={() => {
              onOpenUpload();
              setIsSidebarOpen(false);
            }}
            className="w-full font-semibold rounded-lg py-5 text-sm transition-all duration-300 hover:-translate-y-0.5"
            style={{ backgroundColor: '#c9a84c', color: '#1a2332' }}
          >
            <Plus className="mr-2 h-4 w-4" />
            UPLOAD NEW
          </Button>

          <button
            onClick={() => {
              logout.mutate();
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white transition-colors text-sm"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
