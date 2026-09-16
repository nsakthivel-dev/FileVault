import { useState, useEffect, useCallback, ReactNode } from "react";
import { ShieldAlert, Lock, AlertTriangle, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ScreenshotShieldProps {
  isProtected: boolean;
  watermarkText?: string;
  recipientName?: string;
  verificationId?: string;
  children: ReactNode;
  className?: string;
}

export function ScreenshotShield({
  isProtected,
  watermarkText,
  recipientName,
  verificationId,
  children,
  className = "",
}: ScreenshotShieldProps) {
  const [isShielded, setIsShielded] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const triggerSecurityAlert = useCallback((reason: string) => {
    setWarningMessage(reason);
    // Clear clipboard to avoid any pasted screenshot
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("Protected by FileVault View-Only Security");
      }
    } catch {
      // Ignore clipboard write errors
    }
    // Auto-dismiss alert
    setTimeout(() => {
      setWarningMessage((prev) => (prev === reason ? null : prev));
    }, 3500);
  }, []);

  useEffect(() => {
    if (!isProtected) return;

    // 1. Obfuscate on focus loss / window blur (triggers on Snipping Tool, Win+Shift+S, Cmd+Shift+4, Alt+Tab)
    const handleBlur = () => {
      setIsShielded(true);
    };

    const handleFocus = () => {
      setIsShielded(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsShielded(true);
      } else {
        setIsShielded(false);
      }
    };

    // 2. Keyboard shortcut interception for screen grab / print
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === "PrintScreen" || e.keyCode === 44 || e.code === "PrintScreen") {
        e.preventDefault();
        e.stopPropagation();
        setIsShielded(true);
        triggerSecurityAlert("Screenshot blocked: Screen captures are disabled for View-Only files.");
        return false;
      }

      // Windows Snipping Tool: Meta + Shift + S / Win + Shift + S
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        setIsShielded(true);
        triggerSecurityAlert("Screenshot shortcut blocked: View-Only documents cannot be captured.");
        return false;
      }

      // macOS Screen Capture shortcuts: Cmd + Shift + 3, 4, 5
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        setIsShielded(true);
        triggerSecurityAlert("macOS screen capture blocked: View-Only documents cannot be captured.");
        return false;
      }

      // Print: Ctrl + P / Cmd + P
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("Printing disabled: View-Only credentials cannot be exported or printed.");
        return false;
      }

      // Save: Ctrl + S / Cmd + S
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("Saving disabled: View-Only files cannot be saved locally.");
        return false;
      }

      // Developer Tools: F12 or Ctrl+Shift+I / J / C
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase()))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("Inspection tools disabled on View-Only documents.");
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.keyCode === 44 || e.code === "PrintScreen") {
        triggerSecurityAlert("Screenshot blocked: Screen captures are disabled.");
      }
    };

    // Prevent context menu (Right-click "Save Image As...")
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerSecurityAlert("Right-click context menu disabled on View-Only documents.");
    };

    // Prevent drag and drop of images
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // Prevent print events
    const handleBeforePrint = () => {
      setIsShielded(true);
      document.body.classList.add("print-blocked");
    };

    const handleAfterPrint = () => {
      document.body.classList.remove("print-blocked");
      setIsShielded(false);
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("print-blocked");
    };
  }, [isProtected, triggerSecurityAlert]);

  const defaultWatermark =
    watermarkText ||
    `FILEVAULT VIEW ONLY • DO NOT CAPTURE • ${verificationId || "RESTRICTED"} • ${
      recipientName || "CONFIDENTIAL"
    }`;

  return (
    <div
      className={`relative select-none ${isProtected ? "view-only-protected" : ""} ${className}`}
      onContextMenu={isProtected ? (e) => e.preventDefault() : undefined}
      onDragStart={isProtected ? (e) => e.preventDefault() : undefined}
    >
      {/* Underlying protected content */}
      <div
        className={`transition-all duration-150 ${
          isShielded && isProtected ? "filter blur-xl opacity-20 pointer-events-none" : ""
        }`}
      >
        {children}
      </div>

      {/* Subtle Non-Obstructive Watermark & Discrete Identification */}
      {isProtected && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none flex items-center justify-center opacity-[0.08]"
          >
            <div className="text-sm sm:text-base font-mono font-bold tracking-widest text-slate-900 whitespace-nowrap rotate-[-22deg]">
              {defaultWatermark}
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-20 select-none">
            <div className="px-3 py-0.5 rounded-full bg-slate-950/60 border border-slate-700/50 backdrop-blur-sm text-[10px] font-mono text-slate-300 shadow flex items-center gap-1.5 opacity-80 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
              <span>Protected View Only • {verificationId || "RESTRICTED"}</span>
            </div>
          </div>
        </>
      )}

      {/* Privacy Shield Overlay when window loses focus (blocks Snipping Tool / background grab) */}
      <AnimatePresence>
        {isShielded && isProtected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsShielded(false)}
            className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center cursor-pointer rounded-inherit border border-amber-500/20"
          >
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-[#c9a84c] shadow-lg animate-pulse">
              <EyeOff className="h-7 w-7" />
            </div>
            <h3 className="text-white font-display font-bold text-sm sm:text-base mb-1">
              Screenshot Protection Active
            </h3>
            <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
              Display is shielded while this window is out of focus to prevent screen captures.
            </p>
            <span className="mt-4 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
              Click or refocus window to continue viewing
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security alert toast if shortcut or capture attempted */}
      <AnimatePresence>
        {warningMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90vw] bg-red-950/95 border border-red-800/90 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-3 pointer-events-auto"
          >
            <div className="h-9 w-9 rounded-xl bg-red-900/60 border border-red-700 flex items-center justify-center shrink-0 text-red-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-red-200">Security Warning</p>
              <p className="text-[11px] text-red-300 leading-snug mt-0.5">{warningMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
