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

describe("Secure Credential Sharing & Public Verification", () => {
  let activeShareId: string;

  it("creates a controlled share link with 24h expiration and 2-view limit", async () => {
    const res = await ownerAgent
      .post("/api/shares")
      .send({
        documentId: testDocId,
        expiresInHours: 24,
        accessLimit: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.documentId).toBe(testDocId);
    expect(res.body.status).toBe("ACTIVE");
    expect(res.body.accessLimit).toBe(2);
    expect(res.body.accessCount).toBe(0);

    activeShareId = res.body.id;
  });

  it("serves public verification without exposing private user account or raw storage paths", async () => {
    // Unauthenticated public request
    const res = await request(app).get(`/api/verify/${activeShareId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("verificationId");
    expect(res.body.verificationId).toMatch(/^FV-/);
    expect(res.body.recipientName).toBe("Alice Walker");
    expect(res.body.institution).toBe("Cambridge University");
    expect(res.body.documentType).toBe("certificates");
    expect(res.body.canViewFile).toBe(true);
    expect(res.body).not.toHaveProperty("storagePath");
    expect(res.body).not.toHaveProperty("ownerId");
  });

  it("allows recipient to preview the shared file and increments access count", async () => {
    const previewRes = await request(app).get(`/api/shares/${activeShareId}/preview`);
    expect(previewRes.status).toBe(200);
    expect(previewRes.headers["content-type"]).toContain("application/pdf");

    // Second view
    const secondRes = await request(app).get(`/api/shares/${activeShareId}/preview`);
    expect(secondRes.status).toBe(200);

    // Third view should exceed the 2-view limit
    const thirdRes = await request(app).get(`/api/shares/${activeShareId}/preview`);
    expect(thirdRes.status).toBe(403);
    expect(thirdRes.body.message).toMatch(/limit/i);
  });

  it("allows owner to revoke a share link", async () => {
    // Create new share for revocation test
    const newShare = await ownerAgent
      .post("/api/shares")
      .send({
        documentId: testDocId,
        expiresInHours: 48,
        accessLimit: 10,
      });

    const shareId = newShare.body.id;

    // Revoke
    const revokeRes = await ownerAgent.delete(`/api/shares/${shareId}`);
    expect(revokeRes.status).toBe(204);

    // Attempting to access revoked share
    const accessRes = await request(app).get(`/api/shares/${shareId}/preview`);
    expect(accessRes.status).toBe(403);
    expect(accessRes.body.message).toMatch(/revoked/i);
  });
});
