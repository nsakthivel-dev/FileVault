import { describe, it, expect } from "vitest";
import { formatAuditLog } from "../client/src/lib/audit-formatter";
import { AuditLogRecord } from "../shared/schema";

describe("Audit Log Human-Readable Sentence Formatter", () => {
  it("formats raw JSON shared document log with email into human sentence", () => {
    const log: AuditLogRecord = {
      id: "1",
      userId: "u1",
      action: "DOCUMENT_SHARED",
      documentId: "d1",
      documentName: "Certificate_e04c287e.png",
      details: JSON.stringify({
        message: 'Document "Certificate_e04c287e.png" shared with nsakthiveldev@gmail.com (Share ID: fv_419c0016)',
      }),
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };

    const formatted = formatAuditLog(log);
    expect(formatted.sentence).toBe("Certificate_e04c287e.png was shared with nsakthiveldev@gmail.com.");
    expect(formatted.actionTitle).toBe("Document Shared");
  });

  it("formats raw JSON share link created with view-only permission", () => {
    const log: AuditLogRecord = {
      id: "2",
      userId: "u1",
      action: "SHARE_CREATED",
      documentId: "d1",
      documentName: "Certificate_e04c287e.png",
      details: '{"message":"Share created (ID: fv_419c0016..., Permission: view, Expires: 2026-09...)"}',
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };

    const formatted = formatAuditLog(log);
    expect(formatted.sentence).toBe("A share link was created for Certificate_e04c287e.png with view-only permission.");
    expect(formatted.actionTitle).toBe("Share Link Created");
  });

  it("formats share link created with view and download permission", () => {
    const log: AuditLogRecord = {
      id: "3",
      userId: "u1",
      action: "DOCUMENT_SHARED",
      documentId: "d1",
      documentName: "Certificate_e04c287e.png",
      details: '{"message":"Share created (ID: fv_419c0016..., Permission: both, Expires: 2026-09...)"}',
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };

    const formatted = formatAuditLog(log);
    expect(formatted.sentence).toBe("A share link was created for Certificate_e04c287e.png with view and download permission.");
  });

  it("formats upload successfully", () => {
    const log: AuditLogRecord = {
      id: "4",
      userId: "u1",
      action: "DOCUMENT_UPLOADED",
      documentId: "d1",
      documentName: "Certificate_e04c287e.png",
      details: '{"message":"Stored in vault and encrypted with SHA-256"}',
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };

    const formatted = formatAuditLog(log);
    expect(formatted.sentence).toBe("Certificate_e04c287e.png was uploaded successfully.");
    expect(formatted.actionTitle).toBe("Document Uploaded");
  });

  it("formats cloud storage synchronization", () => {
    const log: AuditLogRecord = {
      id: "5",
      userId: "u1",
      action: "DOCUMENT_UPLOADED",
      documentId: "d1",
      documentName: "Certificate_e04c287e.png",
      details: 'Synchronized from cloud storage manifest',
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };

    const formatted = formatAuditLog(log);
    expect(formatted.sentence).toBe("Certificate_e04c287e.png was synchronized from cloud storage successfully.");
    expect(formatted.actionTitle).toBe("Cloud Synchronized");
  });

  it("formats moved to trash and restore", () => {
    const trashLog: AuditLogRecord = {
      id: "6",
      userId: "u1",
      action: "DOCUMENT_TRASHED",
      documentId: "d1",
      documentName: "Quarterly_Report.pdf",
      details: "Moved to 30-day trash bin",
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };
    expect(formatAuditLog(trashLog).sentence).toBe("Quarterly_Report.pdf was moved to the 30-day trash bin.");

    const restoreLog: AuditLogRecord = {
      id: "7",
      userId: "u1",
      action: "DOCUMENT_RESTORED",
      documentId: "d1",
      documentName: "Quarterly_Report.pdf",
      details: "Restored from trash",
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };
    expect(formatAuditLog(restoreLog).sentence).toBe("Quarterly_Report.pdf was restored from the trash bin.");
  });

  it("formats download with recipient email", () => {
    const downloadLog: AuditLogRecord = {
      id: "8",
      userId: "u1",
      action: "DOCUMENT_DOWNLOADED",
      documentId: "d1",
      documentName: "Resume.pdf",
      details: 'Recipient (recruiter@company.com) downloaded document via share link fv_98273',
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };
    expect(formatAuditLog(downloadLog).sentence).toBe("Resume.pdf was downloaded by recruiter@company.com.");
  });

  it("formats AI analysis and human review", () => {
    const aiLog: AuditLogRecord = {
      id: "9",
      userId: "u1",
      action: "DOCUMENT_AI_PROCESSED",
      documentId: "d1",
      documentName: "Passport.jpg",
      details: 'Extracted metadata: identity',
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };
    expect(formatAuditLog(aiLog).sentence).toBe("Passport.jpg was analyzed and verified by AI.");

    const reviewLog: AuditLogRecord = {
      id: "10",
      userId: "u1",
      action: "DOCUMENT_REVIEWED",
      documentId: "d1",
      documentName: "Passport.jpg",
      details: 'Human review finalized with action: accepted',
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };
    expect(formatAuditLog(reviewLog).sentence).toBe("Metadata review for Passport.jpg was finalized.");
  });

  it("never outputs raw JSON or internal IDs", () => {
    const messyLog: AuditLogRecord = {
      id: "11",
      userId: "u1",
      action: "DOCUMENT_SHARED",
      documentId: "d1",
      documentName: "NDA.pdf",
      details: '{"rawId":"123","token":"fv_991823","message":"Share created (ID: fv_991823, Permission: view)"}',
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };
    const res = formatAuditLog(messyLog);
    expect(res.sentence).not.toContain("{");
    expect(res.sentence).not.toContain("}");
    expect(res.sentence).not.toContain("fv_991823");
    expect(res.sentence).toBe("A share link was created for NDA.pdf with view-only permission.");
  });
});
