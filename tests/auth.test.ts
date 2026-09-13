import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
});

describe("Authentication Lifecycle & Access Control", () => {
  const testUser = {
    username: `vault_user_${Date.now()}`,
    password: "SecureVaultPassword123!",
    email: `test_${Date.now()}@filevault.com`,
    name: "Security Tester",
  };

  const agent = () => request.agent(app);

  it("registers a new user successfully", async () => {
    const res = await request(app)
      .post("/api/register")
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.username).toBe(testUser.username);
    expect(res.body).not.toHaveProperty("password");
  });

  it("rejects registration with duplicate username", async () => {
    const res = await request(app)
      .post("/api/register")
      .send(testUser);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("authenticates and logs in the registered user", async () => {
    const userAgent = agent();
    const loginRes = await userAgent
      .post("/api/login")
      .send({
        username: testUser.username,
        password: testUser.password,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.username).toBe(testUser.username);

    // Verify session persistence
    const meRes = await userAgent.get("/api/user");
    expect(meRes.status).toBe(200);
    expect(meRes.body.username).toBe(testUser.username);
  });

  it("rejects login with invalid password", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({
        username: testUser.username,
        password: "WrongPassword!",
      });

    expect(res.status).toBe(401);
  });

  it("blocks unauthenticated access to protected endpoints", async () => {
    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Unauthorized/i);
  });

  it("logs out user securely", async () => {
    const userAgent = agent();
    await userAgent.post("/api/login").send({
      username: testUser.username,
      password: testUser.password,
    });

    const logoutRes = await userAgent.post("/api/logout");
    expect(logoutRes.status).toBe(200);

    const checkRes = await userAgent.get("/api/user");
    expect(checkRes.status).toBe(401);
  });
});
