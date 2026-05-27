const { errorResponse } = require("../utils/responseHandler");
const { validationResult } = require("express-validator");




// Call this at start of any controller that has validation rules
const validateRequest = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, "Validation failed", 400, errors.array());
  }
  return null;
};

// Global error handler — mounted last in server.js
// All unhandled errors land here automatically
const errorHandler = (err, req, res, next) => {
  console.error(`❌ Error: ${err.message}`);
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return errorResponse(res, "Validation failed", 400, messages);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(
      res,
      `${field} already exists`,
      409
    );
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return errorResponse(res, "Invalid token", 401);
  }
  if (err.name === "TokenExpiredError") {
    return errorResponse(res, "Token expired", 401);
  }

  // Default server error
  return errorResponse(
    res,
    err.message || "Internal server error",
    err.statusCode || 500
  );
};

// 404 handler — for routes that don't exist
const notFoundHandler = (req, res) => {
  return errorResponse(
    res,
    `Route ${req.originalUrl} not found`,
    404
  );
};

module.exports = { errorHandler, notFoundHandler,validateRequest };