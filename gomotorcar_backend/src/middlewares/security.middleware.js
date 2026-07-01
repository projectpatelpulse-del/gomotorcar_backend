const helmet            = require("helmet");
const rateLimit          = require("express-rate-limit");
const mongoSanitize      = require("express-mongo-sanitize");
const hpp                = require("hpp");
const compression        = require("compression");

// ─────────────────────────────────────────────────────────
// 1. HELMET — Sets secure HTTP headers
// Prevents XSS, clickjacking, MIME sniffing attacks
// ─────────────────────────────────────────────────────────
const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // API doesn't serve HTML
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// ─────────────────────────────────────────────────────────
// 2. RATE LIMITING — General API limit
// Prevents brute force and DDoS attacks
// ─────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      300,             // 300 requests per IP per window
  message: {
    success: false,
    message: "Too many requests. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ─────────────────────────────────────────────────────────
// 3. STRICT RATE LIMITING — OTP endpoints
// Prevents OTP spam/abuse
// ─────────────────────────────────────────────────────────
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max:      5,               // 5 OTP requests per window
  message: {
    success: false,
    message: "Too many OTP requests. Please try again after 10 minutes.",
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ─────────────────────────────────────────────────────────
// 4. LOGIN RATE LIMITING — Prevent brute force
// ─────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10, // 10 login attempts per 15 min
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ─────────────────────────────────────────────────────────
// 5. PAYMENT RATE LIMITING — Prevent payment abuse
// ─────────────────────────────────────────────────────────
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max:      20,
  message: {
    success: false,
    message: "Too many payment requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ─────────────────────────────────────────────────────────
// 6. MONGO SANITIZE — Prevent NoSQL injection
// Strips $ and . from request data
// Some versions of Node/Express expose `req.query` as a getter-only
// property; attempting to mutate it causes errors. Wrap the sanitizer
// and skip full-request sanitization for safe GET-like methods.
// ─────────────────────────────────────────────────────────
const _rawMongoSanitize = mongoSanitize({
  replaceWith: "_",
});

const mongoSanitizeMiddleware = (req, res, next) => {
  // Avoid mutating `req.query` for safe read-only requests
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  return _rawMongoSanitize(req, res, next);
};

// ─────────────────────────────────────────────────────────
// 7. HPP — Prevent HTTP Parameter Pollution
// ─────────────────────────────────────────────────────────
const hppMiddleware = hpp();

// ─────────────────────────────────────────────────────────
// 8. COMPRESSION — Gzip responses for performance
// ─────────────────────────────────────────────────────────
const compressionMiddleware = compression();

module.exports = {
  helmetMiddleware,
  generalLimiter,
  otpLimiter,
  loginLimiter,
  paymentLimiter,
  mongoSanitizeMiddleware,
  hppMiddleware,
  compressionMiddleware,
};