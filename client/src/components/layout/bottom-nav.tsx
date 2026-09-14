import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  Share2, 
  Clock, 
  Plus 
} from "lucide-react";
import { useUserShares } from "@/hooks/use-documents";

interface BottomNavProps {
  onOpenUpload: () => void;
}

export function BottomNav({ onOpenUpload }: BottomNavProps) {
  const [location] = useLocation();
  const { data: userShares } = useUserShares();
  const sharedCount = userShares?.length ?? 0;

  const isTabActive = (path: string) => {
    if (path === "/" || path === "/dashboard") {
      return location === "/" || location === "/dashboard";
    }
    return location.startsWith(path);
  };

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(15,23,42,0.08)] pb-safe"
    >
      <div className="flex items-center justify-around px-2 h-16 max-w-md mx-auto relative">
        {/* Tab 1: Dashboard */}
        <Link 
          href="/"
          className={`flex flex-col items-center justify-center flex-1 py-1 tap-highlight-transparent transition-all ${
            isTabActive("/") ? "text-slate-950 font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
          }`}
        >
          <div className="relative p-1">
            <LayoutDashboard className={`h-5 w-5 ${isTabActive("/") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            {isTabActive("/") && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full bg-slate-950" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Vault</span>
        </Link>

        {/* Tab 2: Documents */}
        <Link 
          href="/documents"
          className={`flex flex-col items-center justify-center flex-1 py-1 tap-highlight-transparent transition-all ${
            isTabActive("/documents") ? "text-slate-950 font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
          }`}
        >
          <div className="relative p-1">
            <FileText className={`h-5 w-5 ${isTabActive("/documents") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            {isTabActive("/documents") && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full bg-slate-950" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Folders</span>
        </Link>

        {/* Center Action: Upload FAB Button */}
        <div className="flex flex-col items-center justify-center flex-1 -mt-5 relative">
          <button
            onClick={onOpenUpload}
            aria-label="Upload Document"
            className="h-12 w-12 rounded-full bg-gradient-to-tr from-slate-950 to-slate-800 text-white shadow-lg shadow-slate-900/30 flex items-center justify-center active:scale-95 transition-transform border-2 border-white"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-semibold text-slate-700 mt-1">Upload</span>
        </div>

        {/* Tab 3: Shared */}
        <Link 
          href="/shared"
          className={`flex flex-col items-center justify-center flex-1 py-1 tap-highlight-transparent transition-all relative ${
            isTabActive("/shared") ? "text-slate-950 font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
          }`}
        >
          <div className="relative p-1">
            <Share2 className={`h-5 w-5 ${isTabActive("/shared") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            {sharedCount > 0 && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
            )}
            {isTabActive("/shared") && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full bg-slate-950" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Shared</span>
        </Link>

        {/* Tab 4: Recent Files */}
        <Link 
          href="/recent"
          className={`flex flex-col items-center justify-center flex-1 py-1 tap-highlight-transparent transition-all ${
            isTabActive("/recent") ? "text-slate-950 font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
          }`}
        >
          <div className="relative p-1">
            <Clock className={`h-5 w-5 ${isTabActive("/recent") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            {isTabActive("/recent") && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full bg-slate-950" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Recent</span>
        </Link>
      </div>
    </nav>
  );
}
