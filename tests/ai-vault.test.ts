import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

let app: express.Express;
let authAgent: ReturnType<typeof request.agent>;
let otherUserAgent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  authAgent = request.agent(app);
  const user = {
    username: `vault_user_${Date.now()}`,
    password: "VaultPassword123!",
  };
  await authAgent.post("/api/register").send(user);

  otherUserAgent = request.agent(app);
  const otherUser = {
    username: `other_vault_user_${Date.now()}`,
    password: "OtherPassword123!",
  };
  await otherUserAgent.post("/api/register").send(otherUser);
});

describe("AI Personal Document & Career Vault Workflow", () => {
  let resumeDocId: string;
  let hackathonDocId: string;
  let exactDuplicateId: string;
  const samplePdf = Buffer.from("%PDF-1.4 ViCodathon 2026 3rd Prize Winner N. Sakthivel Hackathon Certificate");

  it("supports single document upload with AI auto-processing", async () => {
    const res = await authAgent
      .post("/api/documents")
      .field("title", "ViCodathon 2026 Award")
      .attach("file", samplePdf, {
        filename: "hackathon_winning_certificate.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    hackathonDocId = res.body.id;

    // Verify initial storage
    expect(res.body.originalName).toBe("hackathon_winning_certificate.pdf");
    expect(res.body.sha256).toBeDefined();

    // Wait 200ms for background processing to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Fetch updated document details
    const docRes = await authAgent.get(`/api/documents/${hackathonDocId}`);
    expect(docRes.status).toBe(200);
    expect(docRes.body.aiProcessed).toBe(true);
    expect(["completed", "review_required"]).toContain(docRes.body.processingStatus);
    expect(docRes.body.confidence).toBeGreaterThan(0);
  });

  it("detects exact duplicate via SHA-256 without re-running AI", async () => {
    // Upload the exact same file buffer
    const res = await authAgent
      .post("/api/documents")
      .attach("file", samplePdf, {
        filename: "copy_of_hackathon.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    exactDuplicateId = res.body.id;

    // Wait for analyzer to process duplicate
    await new Promise((resolve) => setTimeout(resolve, 300));

    const docRes = await authAgent.get(`/api/documents/${exactDuplicateId}`);
    expect(docRes.status).toBe(200);
    expect(docRes.body.duplicateStatus).toBe("exact_duplicate");
    expect(docRes.body.processingStatus).toBe("duplicate");
    expect(docRes.body.duplicateOfId).toBe(hackathonDocId);
  });

  it("resolves duplicate by choosing keep_both", async () => {
    const res = await authAgent
      .post(`/api/documents/${exactDuplicateId}/resolve-duplicate`)
      .send({ action: "keep_both" });

    expect(res.status).toBe(200);
    expect(res.body.duplicateStatus).toBe("unique");
    expect(res.body.processingStatus).toBe("completed");
  });

  it("supports batch upload of multiple documents concurrently", async () => {
    const resumeBuf = Buffer.from("%PDF-1.4 John Doe Senior Software Engineer Resume");
    const certBuf = Buffer.from("%PDF-1.4 AWS Certified Solutions Architect Certificate");

    const res = await authAgent
      .post("/api/documents/batch")
      .attach("files", resumeBuf, {
        filename: "john_resume.pdf",
        contentType: "application/pdf",
      })
      .attach("files", certBuf, {
        filename: "aws_cert.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(2);
    expect(res.body.successful).toBe(2);
    expect(res.body.documents.length).toBe(2);

    resumeDocId = res.body.documents[0].id;

    // Let background processing settle
    await new Promise((resolve) => setTimeout(resolve, 400));

    const checkResume = await authAgent.get(`/api/documents/${resumeDocId}`);
    expect(checkResume.status).toBe(200);
    expect(checkResume.body.aiProcessed).toBe(true);
  });

  it("supports human review and user override of AI metadata", async () => {
    const reviewPayload = {
      action: "edit" as const,
      documentType: "achievement",
      subType: "hackathon",
      title: "ViCodathon 2026 - 3rd Place",
      personName: "N. Sakthivel",
      organization: "Tech Innovation Corp",
      achievement: "3rd Prize Winner",
      rank: "3rd Place",
      skills: ["React", "TypeScript", "Node.js", "AI"],
      tags: ["Hackathon", "Winner", "2026", "Award"],
    };

    const res = await authAgent
      .post(`/api/documents/${hackathonDocId}/review`)
      .send(reviewPayload);

    expect(res.status).toBe(200);
    expect(res.body.processingStatus).toBe("completed");
    expect(res.body.title).toBe("ViCodathon 2026 - 3rd Place");
    expect(res.body.personName).toBe("N. Sakthivel");
    expect(res.body.achievement).toBe("3rd Prize Winner");
    expect(res.body.tags).toContain("Winner");
    expect(res.body.skills).toContain("React");
  });

  it("allows interactive tag addition and removal", async () => {
    // Add tag
    const addRes = await authAgent
      .post(`/api/documents/${hackathonDocId}/tags`)
      .send({ tag: "TopPerformer", action: "add" });

    expect(addRes.status).toBe(200);
    expect(addRes.body.tags).toContain("TopPerformer");

    // Remove tag
    const removeRes = await authAgent
      .post(`/api/documents/${hackathonDocId}/tags`)
      .send({ tag: "TopPerformer", action: "remove" });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.tags).not.toContain("TopPerformer");
  });

  it("supports document reprocessing", async () => {
    const res = await authAgent
      .post(`/api/documents/${hackathonDocId}/reprocess`);

    expect(res.status).toBe(200);
    expect(res.body.processingStatus).toBe("processing");
  });

  it("enforces tenant privacy: user B cannot access user A's documents", async () => {
    const res = await otherUserAgent.get(`/api/documents/${hackathonDocId}`);
    expect(res.status).toBe(404);

    const reviewRes = await otherUserAgent
      .post(`/api/documents/${hackathonDocId}/review`)
      .send({ action: "accept" });
    expect(reviewRes.status).toBe(404);
  });

  it("provides comprehensive dashboard statistics including career categories", async () => {
    const statsRes = await authAgent.get("/api/dashboard/stats");
    expect(statsRes.status).toBe(200);
    expect(statsRes.body).toHaveProperty("total");
    expect(statsRes.body).toHaveProperty("byCategory");
    expect(statsRes.body).toHaveProperty("byProcessingStatus");
    expect(statsRes.body).toHaveProperty("needsReviewCount");
    expect(statsRes.body).toHaveProperty("duplicatesCount");
    expect(statsRes.body.total).toBeGreaterThanOrEqual(3);
  });
});
