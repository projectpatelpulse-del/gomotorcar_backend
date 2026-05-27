const jwt  = require("jsonwebtoken");
const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const { errorResponse } = require("../utils/responseHandler");
const { USER_STATUS, SINGLE_SESSION_ROLES } = require("../config/constants");

// ─────────────────────────────────────────────────────────
// Middleware 1: authenticate
// Verifies JWT token on every protected route
// Attaches user to req.user
// ─────────────────────────────────────────────────────────
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return errorResponse(res, "Access denied. No token provided.", 401);
  }

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return errorResponse(res, "Token expired. Please login again.", 401);
    }
    return errorResponse(res, "Invalid token.", 401);
  }

  // Find user from DB — always fetch fresh (role/status may have changed)
  const user = await User.findById(decoded.id).select("-sessionToken");
  if (!user || user.isDeleted) {
    return errorResponse(res, "User not found.", 401);
  }

  // Attach user to request
  req.user = user;
  next();
});

// ─────────────────────────────────────────────────────────
// Middleware 2: requireRole
// Usage: requireRole("CL", "SU")
// Checks if logged in user has one of the allowed roles
// ─────────────────────────────────────────────────────────
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "Unauthenticated", 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied. Required role: ${roles.join(" or ")}`,
        403
      );
    }

    next();
  };
};

// ─────────────────────────────────────────────────────────
// Middleware 3: requireActiveAccount
// Checks that account status is active
// Use this on any route that requires a fully approved user
// ─────────────────────────────────────────────────────────
const requireActiveAccount = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, "Unauthenticated", 401);
  }

  if (req.user.status !== USER_STATUS.ACTIVE) {
    return errorResponse(
      res,
      `Account is ${req.user.status}. Please contact support.`,
      403
    );
  }

  next();
};

module.exports = {
  authenticate,
  requireRole,
  requireActiveAccount,
};