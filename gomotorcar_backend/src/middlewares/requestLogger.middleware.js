const logger = require("../utils/logger");

// ─────────────────────────────────────────────────────────
// Log every API request with timing
// Helps debug slow queries and track usage
// ─────────────────────────────────────────────────────────
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logMessage =
      `${req.method} ${req.originalUrl} ` +
      `| Status: ${res.statusCode} ` +
      `| ${duration}ms ` +
      `| IP: ${req.ip}`;

    if (res.statusCode >= 500) {
      logger.error(logMessage);
    } else if (res.statusCode >= 400) {
      logger.warn(logMessage);
    } else if (duration > 1000) {
      // Flag slow requests (>1 second)
      logger.warn(`SLOW REQUEST: ${logMessage}`);
    } else {
      logger.info(logMessage);
    }
  });

  next();
};

module.exports = requestLogger;