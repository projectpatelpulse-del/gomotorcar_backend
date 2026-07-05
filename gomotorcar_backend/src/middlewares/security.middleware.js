const helmet            = require("helmet");
const rateLimit          = require("express-rate-limit");
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
// Wrapped to handle Express 5.x read-only req.query property
// ─────────────────────────────────────────────────────────
const mongoSanitizeMiddleware = (req, res, next) => {
  try {
    // Only sanitize body and params, skip query (read-only in Express 5.x)
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        req.body[key] = sanitizeValue(req.body[key]);
      });
    }
    if (req.params) {
      Object.keys(req.params).forEach(key => {
        req.params[key] = sanitizeValue(req.params[key]);
      });
    }
  } catch (error) {
    console.warn('[SECURITY] Sanitization error:', error.message);
  }
  next();
};

// Helper function to recursively sanitize values
const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return value.replace(/[$.]/g, '_');
  } else if (typeof value === 'object' && value !== null) {
    const sanitized = Array.isArray(value) ? [] : {};
    Object.keys(value).forEach(key => {
      const newKey = key.replace(/[$.]/g, '_');
      sanitized[newKey] = sanitizeValue(value[key]);
    });
    return sanitized;
  }
  return value;
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