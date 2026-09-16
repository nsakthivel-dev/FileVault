import { useState, useEffect, useRef, useCallback, MouseEvent, TouchEvent } from "react";
import { Shield, EyeOff, Lock, AlertTriangle, Scan, Eye, ZoomIn, ZoomOut, RotateCw, ShieldAlert } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [naturalWidth, setNaturalWidth] = useState(800);
  const [naturalHeight, setNaturalHeight] = useState(600);

  // Security states
  const [isBlackedOut, setIsBlackedOut] = useState(false);
  const [isOutOfFocus, setIsOutOfFocus] = useState(false);
  const [isMouseOut, setIsMouseOut] = useState(false);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  // Spotlight Lens state (Tracks active focus area)
  // By default, spotlight lens is active in View-Only mode to make full-page screenshots impossible
  const [useSpotlight, setUseSpotlight] = useState(isProtected);
  const [lensPos, setLensPos] = useState({ x: 50, y: 50 }); // percentage

  const triggerSecurityAlert = useCallback((reason: string) => {
    setSecurityAlert(reason);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("Screen capture prohibited: FileVault View-Only Security Policy.");
      }
    } catch {}
    setTimeout(() => {
      setSecurityAlert((prev) => (prev === reason ? null : prev));
    }, 3500);
  }, []);

  // 1. Draw image and burn-in permanent dual-tone forensic watermark on canvas
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

      // Draw original image
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      // If protected: burn-in indelibly into canvas pixels
      if (isProtected) {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate((-28 * Math.PI) / 180);
        ctx.translate(-w / 2, -h / 2);

        const fontSize = Math.max(16, Math.floor(w / 45));
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const text1 = `FILEVAULT VIEW-ONLY • DO NOT CAPTURE • ${verificationId}`;
        const text2 = `ID: ${verificationId} • RECIPIENT: ${recipientName.toUpperCase()}`;

        const rowGap = fontSize * 3.8;
        const colGap = Math.floor(w / 2.2);

        // Multi-pass dual-tone watermark (white shadow outline + bold dark core)
        // This guarantees maximum readability and defacement on BOTH dark and light backgrounds
        for (let y = -h; y < h * 2; y += rowGap) {
          for (let x = -w; x < w * 2; x += colGap) {
            const currentText = (Math.floor(y / rowGap) % 2 === 0) ? text1 : text2;

            // Crisp light outline
            ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
            ctx.lineWidth = 3;
            ctx.strokeText(currentText, x, y);

            // Dark semi-transparent core
            ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
            ctx.fillText(currentText, x, y);
          }
        }
        ctx.restore();
      }
    },
    [isProtected, recipientName, verificationId]
  );

  // 2. Fetch and load image into memory
  useEffect(() => {
    let active = true;
    setImageLoaded(false);
    setImageFailed(false);

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (!active) return;
      setNaturalWidth(img.naturalWidth || 800);
      setNaturalHeight(img.naturalHeight || 600);
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

  // 3. Robust Screenshot, Hotkey, and Blur Detection
  useEffect(() => {
    if (!isProtected) return;

    // Window focus loss / visibility change
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

    // Cursor leaves page (triggers when moving mouse to Snipping tool, secondary screen, or taskbar)
    const handleMouseLeave = () => {
      setIsMouseOut(true);
    };

    const handleMouseEnter = () => {
      setIsMouseOut(false);
    };

    // KEYDOWN capture phase for instantaneous blackout BEFORE screen grab occurs
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. PrintScreen key (any modifier or standalone)
      if (
        e.key === "PrintScreen" ||
        e.code === "PrintScreen" ||
        e.keyCode === 44 ||
        e.which === 44
      ) {
        e.preventDefault();
        e.stopPropagation();
        setIsBlackedOut(true);
        triggerSecurityAlert("Screenshot blocked: Screen captures are disabled for View-Only files.");
        setTimeout(() => setIsBlackedOut(false), 1400);
        return false;
      }

      // 2. Windows Snipping Tool: Win + Shift + S
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key.toLowerCase() === "s" || e.code === "KeyS")) {
        e.preventDefault();
        e.stopPropagation();
        setIsBlackedOut(true);
        triggerSecurityAlert("Snipping Tool blocked: View-Only documents cannot be captured.");
        setTimeout(() => setIsBlackedOut(false), 1400);
        return false;
      }

      // 3. macOS Screen Capture: Cmd + Shift + 3 / 4 / 5
      if (e.metaKey && e.shiftKey && ["3", "4", "5", "Digit3", "Digit4", "Digit5"].includes(e.code || e.key)) {
        e.preventDefault();
        e.stopPropagation();
        setIsBlackedOut(true);
        triggerSecurityAlert("macOS screen capture blocked: View-Only documents cannot be captured.");
        setTimeout(() => setIsBlackedOut(false), 1400);
        return false;
      }

      // 4. Print: Ctrl + P / Cmd + P
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "p" || e.code === "KeyP")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("Printing disabled: View-Only credentials cannot be printed or exported to PDF.");
        return false;
      }

      // 5. Save: Ctrl + S / Cmd + S
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "s" || e.code === "KeyS")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("Saving disabled: View-Only files cannot be saved locally.");
        return false;
      }

      // 6. Developer Tools: F12 or Ctrl+Shift+I / J / C
      if (
        e.key === "F12" ||
        e.code === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase()))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("DevTools inspection disabled on View-Only documents.");
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
    document.addEventListener("mouseleave", handleMouseLeave, true);
    document.addEventListener("mouseenter", handleMouseEnter, true);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("blur", handleBlur, true);
      window.removeEventListener("focus", handleFocus, true);
      document.removeEventListener("visibilitychange", handleVisibility, true);
      document.removeEventListener("mouseleave", handleMouseLeave, true);
      document.removeEventListener("mouseenter", handleMouseEnter, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("print-blocked");
    };
  }, [isProtected, triggerSecurityAlert]);

  // 4. Handle Spotlight Lens movement
  const handlePointerMove = (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    setLensPos({ x, y });
  };

  const isShieldActive = isProtected && (isBlackedOut || isOutOfFocus || isMouseOut);

  return (
    <div
      ref={containerRef}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onContextMenu={isProtected ? (e) => e.preventDefault() : undefined}
      onDragStart={isProtected ? (e) => e.preventDefault() : undefined}
      onSelectCapture={isProtected ? (e) => e.preventDefault() : undefined}
      className={`relative select-none touch-none ${
        isProtected ? "view-only-protected" : ""
      } ${className}`}
    >
      {/* Spotlight Lens Toggle Control (Floating Toolbar) */}
      {isProtected && imageLoaded && !imageFailed && (
        <div className="absolute -top-10 right-2 z-40 flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setUseSpotlight((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-md ${
              useSpotlight
                ? "bg-[#c9a84c] text-slate-950 hover:bg-[#d8b75b]"
                : "bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700"
            }`}
            title="Toggle Anti-Screenshot Focus Spotlight Lens"
          >
            <Scan className="h-3 w-3" />
            <span>{useSpotlight ? "Spotlight Guard (Active)" : "Enable Spotlight Guard"}</span>
          </button>
        </div>
      )}

      {/* Main Document Canvas Viewport */}
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
          className="max-h-[78vh] max-w-[88vw] w-auto h-auto rounded-lg shadow-2xl object-contain block select-none pointer-events-none"
          style={{
            maxWidth: "100%",
            height: "auto",
          }}
        />

        {/* Dynamic Anti-Screenshot Reading Spotlight Mask */}
        {/* Only reveals the portion under the user's cursor / touch. Screenshots only capture a small fraction! */}
        {isProtected && useSpotlight && imageLoaded && !imageFailed && (
          <div
            className="absolute inset-0 z-25 pointer-events-none transition-all duration-75"
            style={{
              background: `radial-gradient(ellipse 260px 140px at ${lensPos.x}% ${lensPos.y}%, transparent 0%, rgba(15, 23, 42, 0.40) 65%, rgba(15, 23, 42, 0.94) 100%)`,
              backdropFilter: "blur(14px)",
            }}
          >
            {/* Soft Focus Ring around cursor */}
            <div
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 border border-[#c9a84c]/60 rounded-full shadow-[0_0_25px_rgba(201,168,76,0.35)]"
              style={{
                left: `${lensPos.x}%`,
                top: `${lensPos.y}%`,
                width: "250px",
                height: "135px",
              }}
            />
          </div>
        )}

        {/* DOM High-Contrast Watermark Layer (Extra guarantee over the canvas surface) */}
        {isProtected && imageLoaded && !imageFailed && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30 overflow-hidden select-none flex flex-wrap items-center justify-around opacity-[0.38] rotate-[-26deg] scale-125"
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="text-[12px] sm:text-xs font-mono font-black tracking-widest text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)] whitespace-nowrap p-3"
              >
                FILEVAULT VIEW ONLY • DO NOT CAPTURE • {verificationId} • {recipientName.toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Heavy Blackout Privacy Shield when capture shortcut pressed or focus lost */}
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
              setIsMouseOut(false);
            }}
            className="absolute inset-0 z-50 bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer rounded-2xl border border-amber-500/30"
          >
            <div className="h-16 w-16 rounded-3xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mb-4 text-[#c9a84c] shadow-2xl animate-pulse">
              <EyeOff className="h-8 w-8" />
            </div>
            <h3 className="text-white font-display font-bold text-base sm:text-lg mb-1.5 tracking-tight">
              Screenshot & Capture Protection Active
            </h3>
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed mb-4">
              {isBlackedOut
                ? "Screen capture shortcut detected. Content is shielded from capture."
                : isOutOfFocus
                ? "Document is hidden while this browser window is out of focus."
                : "Document is protected while the cursor is outside the viewing frame."}
            </p>
            <span className="px-4 py-1.5 rounded-full bg-slate-900 text-[#c9a84c] text-xs font-semibold border border-[#c9a84c]/30 shadow-lg hover:bg-slate-800 transition-colors">
              Click or tap anywhere to resume viewing
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
              <p className="text-xs font-bold text-red-100">Security Warning</p>
              <p className="text-[11px] text-red-300 leading-snug mt-0.5">{securityAlert}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
