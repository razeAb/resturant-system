jest.mock("../utils/firebaseAdmin");

const express = require("express");
const request = require("supertest");
const { connect, disconnect, clear } = require("./setup/db");
const { verifyFirebaseIdToken } = require("../utils/firebaseAdmin");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

let app;

beforeAll(async () => {
  await connect();
  const authRoutes = require("../routes/authRoutes");
  app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
});
afterAll(async () => await disconnect());
afterEach(async () => {
  await clear();
  jest.clearAllMocks();
});

// Regression test for the auth bypass fixed this session: the route used to trust
// req.body.email outright, so anyone could log in as any existing user with no token.
describe("POST /api/auth/firebase-login", () => {
  test("rejects when no Authorization header is sent", async () => {
    const res = await request(app).post("/api/auth/firebase-login").send({ email: "victim@test.com" });
    expect(res.status).toBe(401);
    expect(verifyFirebaseIdToken).not.toHaveBeenCalled();
  });

  test("rejects when the token fails verification", async () => {
    verifyFirebaseIdToken.mockRejectedValue(new Error("invalid"));
    const res = await request(app).post("/api/auth/firebase-login").set("Authorization", "Bearer garbage").send({ email: "victim@test.com" });
    expect(res.status).toBe(401);
  });

  test("rejects when the verified token has no verified email", async () => {
    verifyFirebaseIdToken.mockResolvedValue({ email: "real@test.com", email_verified: false });
    const res = await request(app).post("/api/auth/firebase-login").set("Authorization", "Bearer sometoken").send({ email: "victim@test.com" });
    expect(res.status).toBe(401);
  });

  test("logs in using the verified token's email, ignoring a spoofed body email", async () => {
    verifyFirebaseIdToken.mockResolvedValue({ email: "real@test.com", email_verified: true, name: "Real User" });
    const res = await request(app)
      .post("/api/auth/firebase-login")
      .set("Authorization", "Bearer sometoken")
      .send({ email: "attacker-controlled@test.com", name: "Attacker" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("real@test.com");
  });
});
