const jwt = require("jsonwebtoken");
const Worker = require("../models/Worker");

const workerProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return res.status(401).json({ message: "❌ No token, authorization denied." });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const worker = await Worker.findById(decoded.workerId).select("-password");
      if (!worker) {
        return res.status(401).json({ message: "❌ Worker not found, authorization denied." });
      }
      req.user = worker;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "❌ Token expired, please login again." });
      } else if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "❌ Invalid token." });
      } else {
        return res.status(401).json({ message: "❌ Token verification failed." });
      }
    }
  } catch (err) {
    console.error("❌ Unexpected error verifying worker token:", err);
    res.status(500).json({ message: "❌ Server error." });
  }
};

module.exports = { workerProtect };