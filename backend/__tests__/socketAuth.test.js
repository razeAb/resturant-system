const jwt = require("jsonwebtoken");
const { connect, disconnect, clear } = require("./setup/db");
const Driver = require("../models/Driver");
const User = require("../models/User");
const { socketAuthMiddleware } = require("../utils/socketAuth");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

beforeAll(async () => await connect());
afterAll(async () => await disconnect());
afterEach(async () => await clear());

function mockSocket(token) {
  const joined = [];
  return { socket: { handshake: { auth: { token } }, join: (room) => joined.push(room) }, joined };
}

const runMiddleware = (socket) => new Promise((resolve, reject) => socketAuthMiddleware(socket, (err) => (err ? reject(err) : resolve())));

describe("socketAuthMiddleware", () => {
  test("joins a driver's own restaurant room for a valid driver token", async () => {
    const driver = await Driver.create({ username: "d1", password: "x", name: "Driver One", restaurant: new (require("mongoose").Types.ObjectId)() });
    const token = jwt.sign({ driverId: driver._id }, process.env.JWT_SECRET);
    const { socket, joined } = mockSocket(token);
    await runMiddleware(socket);
    expect(joined).toEqual([`drivers:${driver.restaurant}`]);
  });

  test("joins the staff room for an admin user token", async () => {
    const admin = await User.create({ name: "Admin", email: "admin@test.com", password: "x", isAdmin: true });
    const token = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET);
    const { socket, joined } = mockSocket(token);
    await runMiddleware(socket);
    expect(joined).toEqual(["staff"]);
  });

  test("joins nothing for a non-admin user token", async () => {
    const user = await User.create({ name: "Regular", email: "regular@test.com", password: "x", isAdmin: false });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    const { socket, joined } = mockSocket(token);
    await runMiddleware(socket);
    expect(joined).toEqual([]);
  });

  test("joins nothing and doesn't throw for a forged/garbage token", async () => {
    const { socket, joined } = mockSocket("not-a-real-token");
    await expect(runMiddleware(socket)).resolves.toBeUndefined();
    expect(joined).toEqual([]);
  });

  test("joins nothing and doesn't throw when there's no token at all", async () => {
    const { socket, joined } = mockSocket(undefined);
    await expect(runMiddleware(socket)).resolves.toBeUndefined();
    expect(joined).toEqual([]);
  });
});
