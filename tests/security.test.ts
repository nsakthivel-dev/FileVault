import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

let app: express.Express;
let userAAgent: ReturnType<typeof request.agent>;
let userBAgent: ReturnType<typeof request.agent>;
let userADocId: string;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  // Setup User A
  userAAgent = request.agent(app);
  await userAAgent.post("/api/register").send({
    username: `user_a_${Date.now()}`,
    password: "PasswordUserA123!",
  });

  // Setup User B
  userBAgent = request.agent(app);
  await userBAgent.post("/api/register").send({
    username: `user_b_${Date.now()}`,
    password: "PasswordUserB123!",
  });

  // User A uploads confidential document
  const uploadRes = await userAAgent
    .post("/api/documents")
    .field("documentType", "identity")
    .field("certificateNumber", "PASSPORT-A-7788")
    .attach("file", Buffer.from("%PDF-1.4 User A Sensitive Passport"), {
      filename: "passport_a.pdf",
      contentType: "application/pdf",
    });

  userADocId = uploadRes.body.id;
});

describe("Multi-Tenant Security & IDOR Prevention", () => {
  it("prevents User B from viewing User A's document metadata", async () => {
    const res = await userBAgent.get(`/api/documents/${userADocId}`);
    expect(res.status).toBe(404);
  });

  it("prevents User B from updating User A's document metadata", async () => {
    const res = await userBAgent
      .patch(`/api/documents/${userADocId}`)
      .send({ institution: "Hacked by User B" });

    expect(res.status).toBe(404);

    // Verify User A's document was unmodified
    const checkRes = await userAAgent.get(`/api/documents/${userADocId}`);
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.institution).not.toBe("Hacked by User B");
  });

  it("prevents User B from downloading User A's document file", async () => {
    const res = await userBAgent.get(`/api/documents/${userADocId}/download`);
    expect(res.status).toBe(404);
  });

  it("prevents User B from deleting User A's document", async () => {
    const res = await userBAgent.delete(`/api/documents/${userADocId}`);
    expect(res.status).toBe(404);

    // Verify document still exists
    const checkRes = await userAAgent.get(`/api/documents/${userADocId}`);
    expect(checkRes.status).toBe(200);
  });

  it("isolates audit trails between users", async () => {
    const logsA = await userAAgent.get("/api/audit-logs");
    const logsB = await userBAgent.get("/api/audit-logs");

    expect(logsA.status).toBe(200);
    expect(logsB.status).toBe(200);

    // User A should have the DOCUMENT_UPLOADED log
    expect(logsA.body.some((l: any) => l.documentId === userADocId)).toBe(true);

    // User B should NOT have any reference to User A's document
    expect(logsB.body.some((l: any) => l.documentId === userADocId)).toBe(false);
  });
});
