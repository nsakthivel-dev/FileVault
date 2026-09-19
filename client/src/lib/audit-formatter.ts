import { AuditLogRecord } from "@shared/schema";

export interface FormattedAuditActivity {
  sentence: string;
  actionTitle: string;
  documentName: string;
  dotColor: string;
  badgeColor: string;
  category: "upload" | "share" | "delete" | "view" | "system" | "security";
}

/**
 * Parses raw or JSON details from an audit log record and extracts meaningful fields
 * while stripping internal UUIDs, database tokens, and raw syntax.
 */
function extractDetailsInfo(rawDetails?: string | null): {
  message: string;
  emails?: string[];
  permission?: string;
  isSync?: boolean;
} {
  if (!rawDetails) {
    return { message: "" };
  }

  let text = String(rawDetails).trim();

  // 1. Try parsing if it's a JSON string
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null) {
        if (typeof parsed.message === "string") {
          text = parsed.message;
        } else if (typeof parsed.details === "string") {
          text = parsed.details;
        } else if (typeof parsed.action === "string") {
          text = parsed.action;
        } else {
          // If object has fields like emails, permission, documentName
          const parts: string[] = [];
          if (parsed.documentName) parts.push(parsed.documentName);
          if (parsed.email) parts.push(`shared with ${parsed.email}`);
          if (parsed.emails && Array.isArray(parsed.emails)) parts.push(`shared with ${parsed.emails.join(", ")}`);
          if (parsed.permission) parts.push(`permission: ${parsed.permission}`);
          text = parts.length > 0 ? parts.join(" ") : "";
        }
      }
    } catch {
      // Continue with string sanitization
    }
  }

  // 2. Extract potential email addresses (e.g. user@example.com)
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emailsFound = text.match(emailRegex) || undefined;

  // 3. Extract permission information
  let permission: string | undefined = undefined;
  const permLower = text.toLowerCase();
  if (permLower.includes("permission: both") || permLower.includes("view and download") || permLower.includes("view_and_download")) {
    permission = "both";
  } else if (permLower.includes("permission: download") || permLower.includes("download-only")) {
    permission = "download";
  } else if (permLower.includes("permission: view") || permLower.includes("view-only") || permLower.includes("view only")) {
    permission = "view";
  }

  // 4. Check for cloud sync indication
  const isSync = permLower.includes("sync") || permLower.includes("cloud storage") || permLower.includes("manifest");

  // 5. Clean up developer strings: remove tokens like (Share ID: fv_...), (ID: ...), via token ...
  let cleaned = text
    .replace(/\s*\((?:Share\s*)?ID:[^)]+\)/gi, "")
    .replace(/\s*via (?:token|link) (?:fv_)?[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*\(Expires:[^)]+\)/gi, "")
    .replace(/\s*\(Permission:[^)]+\)/gi, "")
    .replace(/^\{.*\}$/g, "")
    .trim();

  // Strict safeguard: If text still contains raw JSON delimiters, clear it
  if (cleaned.startsWith("{") || cleaned.includes('":') || cleaned.endsWith("}")) {
    cleaned = "";
  }

  return {
    message: cleaned,
    emails: emailsFound ? Array.from(new Set(emailsFound)) : undefined,
    permission,
    isSync,
  };
}

/**
 * Converts any AuditLogRecord into a clear, natural, user-friendly sentence.
 */
export function formatAuditLog(log: AuditLogRecord): FormattedAuditActivity {
  const actionUpper = (log.action || "").toUpperCase().trim();
  const { message, emails, permission, isSync } = extractDetailsInfo(log.details);

  // Extract document name from log or details
  let docName = (log.documentName || "").trim();
  if (!docName && message) {
    const quotedMatch = message.match(/"([^"]+)"|'([^']+)'/);
    if (quotedMatch) {
      docName = quotedMatch[1] || quotedMatch[2];
    }
  }
  const displayDocName = docName || "Document";

  // Check action categories
  const isUpload = actionUpper.includes("UPLOAD");
  const isTrash = actionUpper.includes("TRASH");
  const isDelete = actionUpper.includes("DELETE") && !isTrash;
  const isRestore = actionUpper.includes("RESTORE");
  const isShareCreate = actionUpper.includes("SHARE_CREATED") || actionUpper === "SHARE" || (actionUpper.includes("SHARED") && !actionUpper.includes("REVOKED") && !actionUpper.includes("ACCESSED"));
  const isShareRevoke = actionUpper.includes("REVOKE");
  const isReview = actionUpper.includes("REVIEW");
  const isShareAccess = !isReview && (actionUpper.includes("SHARE_ACCESSED") || actionUpper.includes("VERIFICATION") || actionUpper.includes("DOCUMENT_VIEWED") || actionUpper === "VIEW");
  const isDownload = actionUpper.includes("DOWNLOAD");
  const isAI = actionUpper.includes("AI") || actionUpper.includes("REPROCESS") || actionUpper.includes("INTELLIGENCE");
  const isDuplicate = actionUpper.includes("DUPLICATE");
  const isPin = actionUpper.includes("PIN");
  const isLogin = actionUpper.includes("LOGIN") || actionUpper.includes("REGISTER");

  // 1. SHARING
  if (isShareCreate) {
    if (emails && emails.length > 0) {
      const emailList = emails.join(", ");
      return {
        sentence: `${displayDocName} was shared with ${emailList}.`,
        actionTitle: "Document Shared",
        documentName: displayDocName,
        dotColor: "bg-blue-500",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        category: "share",
      };
    }

    if (permission === "view") {
      return {
        sentence: `A share link was created for ${displayDocName} with view-only permission.`,
        actionTitle: "Share Link Created",
        documentName: displayDocName,
        dotColor: "bg-blue-500",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        category: "share",
      };
    }

    if (permission === "both" || permission === "download") {
      return {
        sentence: `A share link was created for ${displayDocName} with view and download permission.`,
        actionTitle: "Share Link Created",
        documentName: displayDocName,
        dotColor: "bg-blue-500",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        category: "share",
      };
    }

    return {
      sentence: `A share link was created for ${displayDocName}.`,
      actionTitle: "Share Link Created",
      documentName: displayDocName,
      dotColor: "bg-blue-500",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      category: "share",
    };
  }

  if (isShareRevoke) {
    return {
      sentence: `Share link for ${displayDocName} was revoked.`,
      actionTitle: "Access Revoked",
      documentName: displayDocName,
      dotColor: "bg-amber-500",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      category: "share",
    };
  }

  if (isShareAccess) {
    if (emails && emails.length > 0) {
      return {
        sentence: `${displayDocName} was viewed by ${emails[0]}.`,
        actionTitle: "Document Viewed",
        documentName: displayDocName,
        dotColor: "bg-indigo-500",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
        category: "view",
      };
    }
    return {
      sentence: `${displayDocName} was viewed via shared verification link.`,
      actionTitle: "Document Viewed",
      documentName: displayDocName,
      dotColor: "bg-indigo-500",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      category: "view",
    };
  }

  // 2. UPLOADS
  if (isUpload) {
    if (isSync) {
      return {
        sentence: `${displayDocName} was synchronized from cloud storage successfully.`,
        actionTitle: "Cloud Synchronized",
        documentName: displayDocName,
        dotColor: "bg-emerald-500",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        category: "upload",
      };
    }
    return {
      sentence: `${displayDocName} was uploaded successfully.`,
      actionTitle: "Document Uploaded",
      documentName: displayDocName,
      dotColor: "bg-emerald-500",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      category: "upload",
    };
  }

  // 3. DELETIONS & TRASH
  if (isTrash) {
    return {
      sentence: `${displayDocName} was moved to the 30-day trash bin.`,
      actionTitle: "Moved to Trash",
      documentName: displayDocName,
      dotColor: "bg-rose-500",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      category: "delete",
    };
  }

  if (isRestore) {
    return {
      sentence: `${displayDocName} was restored from the trash bin.`,
      actionTitle: "Document Restored",
      documentName: displayDocName,
      dotColor: "bg-emerald-500",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      category: "upload",
    };
  }

  if (isDelete) {
    if (actionUpper.includes("TRASH_EMPTIED")) {
      return {
        sentence: "All items in the trash bin were permanently purged.",
        actionTitle: "Trash Emptied",
        documentName: "Trash Bin",
        dotColor: "bg-rose-600",
        badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
        category: "delete",
      };
    }
    return {
      sentence: `${displayDocName} was permanently deleted.`,
      actionTitle: "Permanently Purged",
      documentName: displayDocName,
      dotColor: "bg-rose-600",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      category: "delete",
    };
  }

  // 4. DOWNLOADS
  if (isDownload) {
    if (emails && emails.length > 0) {
      return {
        sentence: `${displayDocName} was downloaded by ${emails[0]}.`,
        actionTitle: "Document Downloaded",
        documentName: displayDocName,
        dotColor: "bg-teal-500",
        badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
        category: "view",
      };
    }
    return {
      sentence: `${displayDocName} was downloaded.`,
      actionTitle: "Document Downloaded",
      documentName: displayDocName,
      dotColor: "bg-teal-500",
      badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
      category: "view",
    };
  }

  // 5. AI & REVIEW
  if (isAI) {
    return {
      sentence: `${displayDocName} was analyzed and verified by AI.`,
      actionTitle: "AI Intelligence Analyzed",
      documentName: displayDocName,
      dotColor: "bg-purple-500",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      category: "system",
    };
  }

  if (isReview) {
    return {
      sentence: `Metadata review for ${displayDocName} was finalized.`,
      actionTitle: "Review Finalized",
      documentName: displayDocName,
      dotColor: "bg-blue-500",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      category: "system",
    };
  }

  if (isDuplicate) {
    return {
      sentence: `Duplicate conflict for ${displayDocName} was resolved.`,
      actionTitle: "Duplicate Resolved",
      documentName: displayDocName,
      dotColor: "bg-amber-500",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      category: "system",
    };
  }

  // 6. PINNING
  if (isPin) {
    const isPinned = actionUpper.includes("UNPIN") ? false : true;
    return {
      sentence: isPinned
        ? `${displayDocName} was pinned to quick access.`
        : `${displayDocName} was unpinned from quick access.`,
      actionTitle: isPinned ? "Pinned to Quick Access" : "Unpinned",
      documentName: displayDocName,
      dotColor: "bg-amber-500",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      category: "system",
    };
  }

  // 7. AUTH & LOGIN
  if (isLogin) {
    return {
      sentence: "Logged into vault securely.",
      actionTitle: "User Login",
      documentName: "Vault Session",
      dotColor: "bg-slate-700",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
      category: "security",
    };
  }

  // 8. FALLBACK CLEANUP
  // If message exists, ensure it ends with a period and clean it
  let fallbackSentence = message || `${displayDocName} was updated.`;
  if (fallbackSentence.includes("{") || fallbackSentence.includes("}") || fallbackSentence.includes('":')) {
    fallbackSentence = `${displayDocName} was updated.`;
  }
  if (!fallbackSentence.endsWith(".")) {
    fallbackSentence += ".";
  }

  return {
    sentence: fallbackSentence,
    actionTitle: "Vault Activity",
    documentName: displayDocName,
    dotColor: "bg-slate-500",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    category: "system",
  };
}
