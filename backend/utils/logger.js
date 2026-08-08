const pino = require("pino");

// JSON lines in production (Render captures stdout/stderr and makes it searchable as-is,
// no separate log-aggregation service needed at this scale); pretty-printed in dev so it's
// still readable in a local terminal.
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV === "production" ? undefined : { target: "pino-pretty" },
});

module.exports = { logger };
