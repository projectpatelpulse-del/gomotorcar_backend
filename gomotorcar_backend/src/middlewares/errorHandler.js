const logger = require("../utils/logger");

// ─────────────────────────────────────────────────────────
// Global error handler — catches all errors
// Never exposes stack traces in production
// ─────────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || "Internal server error";

  // Log every error
  logger.error(
    `${req.method} ${req.originalUrl} | ${message} | ${err.stack || ""}`
  );

  // ─── Mongoose Validation Error ──────────────────────────
  if (err.name === "ValidationError") {
    statusCode = 400;
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(statusCode).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  // ─── Mongoose Duplicate Key Error ───────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    message = `Duplicate value for ${field}. Already exists.`;
  }

  // ─── Mongoose Cast Error (invalid ObjectId) ─────────────
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ─── JWT Errors ──────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please login again.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Session expired. Please login again.";
  }

  // ─── Never expose stack trace in production ─────────────
  const response = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

// ─────────────────────────────────────────────────────────
// 404 handler — for undefined routes
// ─────────────────────────────────────────────────────────
const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

module.exports = { errorHandler, notFoundHandler };