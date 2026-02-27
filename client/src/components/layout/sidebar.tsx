import { Link, useLocation } from "wouter";
import { LayoutDashboard, CloudUpload, Settings, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function Sidebar({ onOpenUpload }: { onOpenUpload: () => void }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    { label: "Settings", icon: Settings, href: "/settings", disabled: true },
  ];

  return (
    <aside className="w-64 bg-primary text-primary-foreground flex flex-col h-full sticky top-0 border-r border-slate-800">
      <div className="p-6 flex items-center space-x-3">
        <div className="h-10 w-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
          <Shield className="h-6 w-6 text-accent-foreground" />
        </div>
        <span className="font-display font-bold text-xl tracking-tight">Vault</span>
      </div>

      <div className="px-4 pb-4">
        <Button 
          onClick={onOpenUpload}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20 font-semibold rounded-xl py-6 transition-all duration-300 hover:-translate-y-0.5"
        >
          <CloudUpload className="mr-2 h-5 w-5" />
          Upload Document
        </Button>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return item.disabled ? (
            <div
              key={item.label}
              className="flex items-center space-x-3 px-4 py-3 rounded-xl text-primary-foreground/40 cursor-not-allowed"
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </div>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? "bg-white/10 text-white font-semibold shadow-inner" 
                  : "text-primary-foreground/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="px-4 py-3 mb-2">
          <p className="text-xs text-primary-foreground/50 font-medium uppercase tracking-wider mb-1">Logged in as</p>
          <p className="font-medium truncate text-sm">{user?.username}</p>
        </div>
        <button
          onClick={() => logout.mutate()}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-primary-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
