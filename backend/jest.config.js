module.exports = {
  testEnvironment: "node",
  testTimeout: 30000, // mongodb-memory-server can take a while on its first run (binary download)
  testPathIgnorePatterns: ["/node_modules/", "/__tests__/setup/"],
};
