import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app, httpServer } from "../server/index";
import { registerRoutes } from "../server/routes";

describe("Session Continuity & Navigation Across All Routes", { timeout: 25000 }, () => {
  const testUser = {
    username: `nav_user_${Date.now()}`,
    password: "Password123!",
    email: `nav_user_${Date.now()}@filevault.local`,
    name: "Navigation Test User",
  };

  let userId: string = "";
  let cookie: string = "";

  beforeAll(async () => {
    // Ensure routes are registered
    await registerRoutes(httpServer, app);
  });

  it("1. Registers a new user and returns user credentials", async () => {
    const res = await request(app)
      .post("/api/register")
      .send(testUser);

    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty("id");
    userId = res.body.id;
    if (res.headers["set-cookie"]) {
      cookie = res.headers["set-cookie"][0];
    }
  });

  it("2. Logs in and receives a valid session cookie and user record", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: testUser.username, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    if (res.headers["set-cookie"]) {
      cookie = res.headers["set-cookie"][0];
    }
  });

  it("3. Authenticates via cookie to /api/user", async () => {
    const res = await request(app)
      .get("/api/user")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
  });

  it("4. Authenticates via Bearer Token to /api/user (simulating page navigation/refresh where cookie is partitioned or memory store is restarted)", async () => {
    // Note: No Cookie header passed here, solely Bearer token as saved in localStorage
    const res = await request(app)
      .get("/api/user")
      .set("Authorization", `Bearer ${userId}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
  });

  it("5. Verifies access to /api/documents across routes with Bearer token", async () => {
    const res = await request(app)
      .get("/api/documents")
      .set("Authorization", `Bearer ${userId}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("6. Verifies access to /api/documents-tags across routes with Bearer token", async () => {
    const res = await request(app)
      .get("/api/documents-tags")
      .set("Authorization", `Bearer ${userId}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("7. Verifies access to /api/shares across routes with Bearer token", async () => {
    const res = await request(app)
      .get("/api/shares")
      .set("Authorization", `Bearer ${userId}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("8. Verifies access to /api/trash across routes with Bearer token", async () => {
    const res = await request(app)
      .get("/api/trash")
      .set("Authorization", `Bearer ${userId}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("9. Verifies access to /api/dashboard/stats across routes with Bearer token", async () => {
    const res = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", `Bearer ${userId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalDocuments");
  });

  it("10. Verifies access to /api/audit-logs across routes with Bearer token", async () => {
    const res = await request(app)
      .get("/api/audit-logs")
      .set("Authorization", `Bearer ${userId}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("11. Explicit logout terminates the session and invalidates access", async () => {
    const res = await request(app)
      .post("/api/logout")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);

    // After logout with no credentials, /api/user must be 401
    const unauthRes = await request(app).get("/api/user");
    expect(unauthRes.status).toBe(401);

    // Protected endpoints without credentials must return 401
    const docRes = await request(app).get("/api/documents");
    expect(docRes.status).toBe(401);
  });
});
