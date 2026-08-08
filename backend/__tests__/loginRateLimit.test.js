const express = require("express");
const request = require("supertest");
const { loginRateLimit } = require("../middleware/loginRateLimit");

function buildApp() {
  const app = express();
  app.post("/login", loginRateLimit, (req, res) => res.status(400).json({ message: "invalid credentials" }));
  return app;
}

describe("loginRateLimit", () => {
  test("allows requests under the threshold", async () => {
    const app = buildApp();
    const res = await request(app).post("/login").send({});
    expect(res.status).toBe(400); // reaches the route handler, not blocked
  });

  test("blocks with 429 once the threshold is exceeded", async () => {
    const app = buildApp();
    let lastStatus;
    for (let i = 0; i < 25; i++) {
      // eslint-disable-next-line no-await-in-loop
      lastStatus = (await request(app).post("/login").send({})).status;
    }
    expect(lastStatus).toBe(429);
  });
});
