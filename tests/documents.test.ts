import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

let app: express.Express;
let authAgent: ReturnType<typeof request.agent>;
let createdDocId: string;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  authAgent = request.agent(app);
  const user = {
    username: `doc_user_${Date.now()}`,
    password: "DocPassword123!",
  };

  await authAgent.post("/api/register").send(user);
});

describe("Document Lifecycle & Cloud Storage Management", () => {
  it("uploads a valid certificate PDF with metadata", async () => {
    const pdfBuffer = Buffer.from("%PDF-1.4 sample file content");

    const res = await authAgent
      .post("/api/documents")
      .field("documentType", "certificates")
      .field("certificateNumber", "CERT-8849-XYZ")
      .field("recipientName", "Jane Doe")
      .field("institution", "MIT Professional Education")
      .field("issueDate", "2026-01-15")
      .field("expiryDate", "2028-01-15")
      .attach("file", pdfBuffer, {
        filename: "degree_certificate.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.originalName).toBe("degree_certificate.pdf");
    expect(res.body.documentType).toBe("certificates");
    expect(res.body.certificateNumber).toBe("CERT-8849-XYZ");
    expect(res.body.storagePath).toContain("users/");
    expect(res.body.storagePath).toContain("/documents/certificates/");

    createdDocId = res.body.id;
  });

  it("rejects unauthorized file formats", async () => {
    const exeBuffer = Buffer.from("MZ malicious file");

    const res = await authAgent
      .post("/api/documents")
      .field("documentType", "other")
      .attach("file", exeBuffer, {
        filename: "malware.exe",
        contentType: "application/x-msdownload",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid file format/i);
  });

  it("retrieves the user's document list", async () => {
    const res = await authAgent.get("/api/documents");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((d: any) => d.id === createdDocId)).toBe(true);
  });

  it("filters documents by category", async () => {
    const resCert = await authAgent.get("/api/documents?category=certificates");
    expect(resCert.status).toBe(200);
    expect(resCert.body.every((d: any) => d.documentType === "certificates")).toBe(true);

    const resIdentity = await authAgent.get("/api/documents?category=identity");
    expect(resIdentity.status).toBe(200);
    expect(resIdentity.body.length).toBe(0);
  });

  it("retrieves single document details", async () => {
    const res = await authAgent.get(`/api/documents/${createdDocId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdDocId);
    expect(res.body.institution).toBe("MIT Professional Education");
  });

  it("updates document metadata", async () => {
    const res = await authAgent
      .patch(`/api/documents/${createdDocId}`)
      .send({
        institution: "Massachusetts Institute of Technology",
        verificationStatus: "Verified",
      });

    expect(res.status).toBe(200);
    expect(res.body.institution).toBe("Massachusetts Institute of Technology");
    expect(res.body.verificationStatus).toBe("Verified");
  });

  it("downloads the document file", async () => {
    const res = await authAgent.get(`/api/documents/${createdDocId}/download`);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain("degree_certificate.pdf");
  });

  it("previews the document inline", async () => {
    const res = await authAgent.get(`/api/documents/${createdDocId}/preview`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });

  it("records audit logs for upload and view operations", async () => {
    const res = await authAgent.get("/api/audit-logs");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((log: any) => log.action === "DOCUMENT_UPLOADED")).toBe(true);
  });

  it("calculates real dashboard metrics", async () => {
    const res = await authAgent.get("/api/dashboard/stats");
    expect(res.status).toBe(200);
    expect(res.body.totalDocuments).toBeGreaterThanOrEqual(1);
    expect(res.body.totalCertificates).toBeGreaterThanOrEqual(1);
    expect(res.body.totalStorageBytes).toBeGreaterThan(0);
  });

  it("deletes the document cleanly", async () => {
    const res = await authAgent.delete(`/api/documents/${createdDocId}`);
    expect(res.status).toBe(204);

    const checkRes = await authAgent.get(`/api/documents/${createdDocId}`);
    expect(checkRes.status).toBe(404);
  });
});
