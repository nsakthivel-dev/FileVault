import { useState, useEffect, useRef, useCallback } from "react";
import { EyeOff, Lock, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SecureDocumentViewerProps {
  src: string;
  alt?: string;
  mimeType?: string | null;
  recipientName?: string;
  verificationId?: string;
  isProtected?: boolean;
  scale?: number;
  rotation?: number;
  className?: string;
}

export function SecureDocumentViewer({
  src,
  alt = "Secured Document",
  mimeType,
  recipientName = "Authorized Viewer",
  verificationId = "FV-RESTRICTED",
  isProtected = true,
  scale = 1,
  rotation = 0,
  className = "",
}: SecureDocumentViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Security blackout states
  const [isBlackedOut, setIsBlackedOut] = useState(false);
  const [isOutOfFocus, setIsOutOfFocus] = useState(false);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  const triggerSecurityAlert = useCallback((reason: string) => {
    setSecurityAlert(reason);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("Screen capture restricted: FileVault View-Only Security Policy.");
      }
    } catch {}
    setTimeout(() => {
      setSecurityAlert((prev) => (prev === reason ? null : prev));
    }, 3500);
  }, []);

  // 1. Draw image onto canvas with subtle, non-obstructive protection marks
  // Exactly ONE clean pass: no repeating grid, no stacking layers, 100% document readability
  const renderCanvas = useCallback(
    (img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = img.naturalWidth || 1200;
      const h = img.naturalHeight || 900;

      canvas.width = w;
      canvas.height = h;

      // Draw crisp original document image
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      if (isProtected) {
        ctx.save();

        // 1. Single subtle diagonal watermark in the center (very low opacity, non-obstructive)
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate((-22 * Math.PI) / 180);

        const centerFontSize = Math.max(16, Math.min(32, Math.floor(w / 40)));
        ctx.font = `600 ${centerFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Extremely subtle semi-transparent watermark that never obscures document text or signatures
        ctx.fillStyle = "rgba(71, 85, 105, 0.12)";
        ctx.fillText(`VIEW ONLY • ${verificationId}`, 0, 0);
        ctx.restore();

        // 2. Discrete security footer strip at the very bottom margin
        const footerFontSize = Math.max(11, Math.min(15, Math.floor(w / 75)));
        ctx.font = `500 ${footerFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        const footerY = h - Math.max(8, Math.floor(h * 0.018));
        ctx.fillStyle = "rgba(100, 116, 139, 0.35)";
        ctx.fillText(
          `Protected View Only • ID: ${verificationId} • Recipient: ${recipientName}`,
          w / 2,
          footerY
        );

        ctx.restore();
      }
    },
    [isProtected, recipientName, verificationId]
  );

  // 2. Load image into memory and render onto canvas
  useEffect(() => {
    let active = true;
    setImageLoaded(false);
    setImageFailed(false);

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (!active) return;
      renderCanvas(img);
      setImageLoaded(true);
    };

    img.onerror = () => {
      if (!active) return;
      setImageFailed(true);
      setImageLoaded(true);
    };

    img.src = src;

    return () => {
      active = false;
    };
  }, [src, renderCanvas]);

  // 3. Hotkey interception and focus-loss shield (without disruptive mouse tracking)
  useEffect(() => {
    if (!isProtected) return;

    const handleBlur = () => {
      setIsOutOfFocus(true);
    };

    const handleFocus = () => {
      setIsOutOfFocus(false);
      setIsBlackedOut(false);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        setIsOutOfFocus(true);
      } else {
        setIsOutOfFocus(false);
      }
    };

    // Hotkey capture for screenshots, print, save, DevTools
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (
        e.key === "PrintScreen" ||
        e.code === "PrintScreen" ||
        e.keyCode === 44 ||
        e.which === 44
      ) {
        e.preventDefault();
        e.stopPropagation();
        setIsBlackedOut(true);
        triggerSecurityAlert("Screenshot attempt detected: Screen capture is disabled for View-Only files.");
        setTimeout(() => setIsBlackedOut(false), 1500);
        return false;
      }

      // Windows Snipping Tool: Win + Shift + S
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key.toLowerCase() === "s" || e.code === "KeyS")) {
        e.preventDefault();
        e.stopPropagation();
        setIsBlackedOut(true);
        triggerSecurityAlert("Snipping Tool blocked: View-Only documents cannot be captured.");
        setTimeout(() => setIsBlackedOut(false), 1500);
        return false;
      }

      // macOS Screen Capture: Cmd + Shift + 3 / 4 / 5
      if (e.metaKey && e.shiftKey && ["3", "4", "5", "Digit3", "Digit4", "Digit5"].includes(e.code || e.key)) {
        e.preventDefault();
        e.stopPropagation();
        setIsBlackedOut(true);
        triggerSecurityAlert("macOS screen capture blocked: View-Only documents cannot be captured.");
        setTimeout(() => setIsBlackedOut(false), 1500);
        return false;
      }

      // Print: Ctrl + P / Cmd + P
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "p" || e.code === "KeyP")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("Printing disabled: View-Only credentials cannot be printed or exported to PDF.");
        return false;
      }

      // Save: Ctrl + S / Cmd + S
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "s" || e.code === "KeyS")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("Saving disabled: View-Only files cannot be downloaded directly.");
        return false;
      }

      // DevTools: F12 or Ctrl+Shift+I/J/C
      if (
        e.key === "F12" ||
        e.code === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase()))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("Inspection disabled on View-Only documents.");
        return false;
      }
    };

    const handleBeforePrint = () => {
      setIsBlackedOut(true);
      document.body.classList.add("print-blocked");
    };

    const handleAfterPrint = () => {
      document.body.classList.remove("print-blocked");
      setIsBlackedOut(false);
    };

    window.addEventListener("blur", handleBlur, true);
    window.addEventListener("focus", handleFocus, true);
    document.addEventListener("visibilitychange", handleVisibility, true);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("blur", handleBlur, true);
      window.removeEventListener("focus", handleFocus, true);
      document.removeEventListener("visibilitychange", handleVisibility, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("print-blocked");
    };
  }, [isProtected, triggerSecurityAlert]);

  const isShieldActive = isProtected && (isBlackedOut || isOutOfFocus);

  return (
    <div
      onContextMenu={isProtected ? (e) => e.preventDefault() : undefined}
      onDragStart={isProtected ? (e) => e.preventDefault() : undefined}
      onSelectCapture={isProtected ? (e) => e.preventDefault() : undefined}
      className={`relative select-none ${
        isProtected ? "view-only-protected" : ""
      } ${className}`}
    >
      {/* Main Document Canvas Viewport - 100% Sharp and Clear */}
      <div
        className={`relative overflow-hidden rounded-xl transition-all duration-150 flex items-center justify-center ${
          isShieldActive ? "filter blur-3xl opacity-0 scale-95" : ""
        }`}
        style={{
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          transformOrigin: "center center",
        }}
      >
        <canvas
          ref={canvasRef}
          className="max-h-[82vh] max-w-[90vw] w-auto h-auto rounded-lg shadow-2xl object-contain block select-none pointer-events-none"
          style={{
            maxWidth: "100%",
            height: "auto",
          }}
        />

        {/* Discrete bottom security pill that doesn't cover document content */}
        {isProtected && imageLoaded && !imageFailed && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-20 px-3 py-0.5 rounded-full bg-slate-950/60 border border-slate-700/50 backdrop-blur-sm text-[10px] font-mono text-slate-300 select-none shadow flex items-center gap-1.5 opacity-80">
            <Lock className="h-2.5 w-2.5 text-[#c9a84c]" />
            <span>Protected View Only • {verificationId}</span>
          </div>
        )}
      </div>

      {/* Privacy Shield when capture shortcut detected or window unfocused */}
      <AnimatePresence>
        {isShieldActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={() => {
              setIsBlackedOut(false);
              setIsOutOfFocus(false);
            }}
            className="absolute inset-0 z-50 bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer rounded-2xl border border-amber-500/30"
          >
            <div className="h-16 w-16 rounded-3xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mb-4 text-[#c9a84c] shadow-2xl animate-pulse">
              <EyeOff className="h-8 w-8" />
            </div>
            <h3 className="text-white font-display font-bold text-base sm:text-lg mb-1.5 tracking-tight">
              Protected Document View
            </h3>
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed mb-4">
              {isBlackedOut
                ? "Capture shortcut detected. Document display is protected."
                : "Document is shielded while this browser window is out of focus."}
            </p>
            <span className="px-4 py-1.5 rounded-full bg-slate-900 text-[#c9a84c] text-xs font-semibold border border-[#c9a84c]/30 shadow-lg hover:bg-slate-800 transition-colors">
              Click anywhere to resume viewing
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Security Alert Toast */}
      <AnimatePresence>
        {securityAlert && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92vw] bg-red-950/95 border border-red-700/90 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-3 pointer-events-auto"
          >
            <div className="h-10 w-10 rounded-xl bg-red-900/80 border border-red-600 flex items-center justify-center shrink-0 text-red-300 shadow-md">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-red-100">Security Notice</p>
              <p className="text-[11px] text-red-300 leading-snug mt-0.5">{securityAlert}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
