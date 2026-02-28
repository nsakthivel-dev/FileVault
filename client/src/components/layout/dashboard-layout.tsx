import { ReactNode, useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { UploadModal } from "../documents/upload-modal";
import { useAuth } from "@/hooks/use-auth";
import { Bell, Menu } from "lucide-react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024); // Tailwind's 'lg' breakpoint is 1024px
  const { user } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar onOpenUpload={() => setIsUploadOpen(true)} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isDesktop={isDesktop} />
      {isSidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0 lg:px-8">
          <div className="flex items-center">
            {!isDesktop && (
              <button
                className="mr-4 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-base font-display font-semibold text-slate-800">Vault Overview</h2>
          </div>
          <div className="flex items-center space-x-3 lg:space-x-6">
            <div className="hidden md:flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-sm text-slate-500">Secure End-to-end encrypted</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-slate-600 hidden sm:inline">
                Signed in as: <span className="font-semibold" style={{ color: '#c9a84c' }}>{user?.username}</span>
              </span>
              <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                <Bell className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
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
