import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

let app: express.Express;
let ownerAgent: ReturnType<typeof request.agent>;
let testDocId: string;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  ownerAgent = request.agent(app);
  await ownerAgent.post("/api/register").send({
    username: `share_owner_${Date.now()}`,
    password: "OwnerPassword123!",
  });

  const uploadRes = await ownerAgent
    .post("/api/documents")
    .field("documentType", "certificates")
    .field("certificateNumber", "FV-CERT-2026-99")
    .field("recipientName", "Alice Walker")
    .field("institution", "Cambridge University")
    .attach("file", Buffer.from("%PDF-1.4 Alice Degree"), {
      filename: "degree.pdf",
      contentType: "application/pdf",
    });

  testDocId = uploadRes.body.id;
});

describe("Secure Email-Based Credential Sharing & Public Verification", () => {
  let activeShareId: string;
  const authorizedEmail = "recipient@example.com";
  const secondAuthorizedEmail = "partner@university.edu";
  const unauthorizedEmail = "intruder@malicious.org";

  it("creates a secure email-associated share link", async () => {
    const res = await ownerAgent
      .post("/api/shares")
      .send({
        documentId: testDocId,
        emails: [authorizedEmail, secondAuthorizedEmail],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.documentId).toBe(testDocId);
    expect(res.body.status).toBe("ACTIVE");
    expect(res.body.recipientEmails).toContain(authorizedEmail);
    expect(res.body.recipientEmails).toContain(secondAuthorizedEmail);

    activeShareId = res.body.id;
  });

  it("prompts for authorized email when accessed without providing an email", async () => {
    const res = await request(app).get(`/api/verify/${activeShareId}`);

    expect(res.status).toBe(200);
    expect(res.body.requiresEmail).toBe(true);
    expect(res.body).toHaveProperty("verificationId");
    expect(res.body.verificationId).toMatch(/^FV-/);
    expect(res.body.documentType).toBe("certificates");
    expect(res.body).not.toHaveProperty("storagePath");
    expect(res.body).not.toHaveProperty("filePreviewUrl");
  });

  it("blocks preview and download when unauthorized email is provided", async () => {
    // Verification check with unauthorized email
    const verifyRes = await request(app).get(`/api/verify/${activeShareId}?email=${unauthorizedEmail}`);
    expect(verifyRes.status).toBe(403);
    expect(verifyRes.body.emailUnauthorized).toBe(true);

    // Direct preview attempt with unauthorized email
    const previewRes = await request(app).get(`/api/shares/${activeShareId}/preview?email=${unauthorizedEmail}`);
    expect(previewRes.status).toBe(403);
    expect(previewRes.body.message).toMatch(/denied|unauthorized|not authorized/i);
  });

  it("allows authorized recipient email to verify and preview the document", async () => {
    const verifyRes = await request(app).get(`/api/verify/${activeShareId}?email=${authorizedEmail}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.requiresEmail).toBe(false);
    expect(verifyRes.body.recipientName).toBe("Alice Walker");
    expect(verifyRes.body.institution).toBe("Cambridge University");
    expect(verifyRes.body.canViewFile).toBe(true);
    expect(verifyRes.body.filePreviewUrl).toContain(encodeURIComponent(authorizedEmail));

    // Preview with authorized email
    const previewRes = await request(app).get(`/api/shares/${activeShareId}/preview?email=${authorizedEmail}`);
    expect(previewRes.status).toBe(200);
    expect(previewRes.headers["content-type"]).toContain("application/pdf");
  });

  it("allows owner to revoke an email-based share link", async () => {
    const newShare = await ownerAgent
      .post("/api/shares")
      .send({
        documentId: testDocId,
        emails: ["temp_guest@domain.com"],
      });

    const shareId = newShare.body.id;

    // Revoke
    const revokeRes = await ownerAgent.delete(`/api/shares/${shareId}`);
    expect(revokeRes.status).toBe(204);

    // Attempting to access revoked share even with authorized email
    const accessRes = await request(app).get(`/api/shares/${shareId}/preview?email=temp_guest@domain.com`);
    expect(accessRes.status).toBe(403);
    expect(accessRes.body.message).toMatch(/revoked/i);
  });
});
