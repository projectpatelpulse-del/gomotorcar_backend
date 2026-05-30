const express = require("express");
const { body } = require("express-validator");
const router  = express.Router();

const {
  sendOTP,
  verifyOTP,
  register,
  login,
  refreshToken,
  logout,
  getMe,
  getRegistrationStatus,
  internalLogin,
  updateFcmToken,
} = require("../controllers/auth.controller");

const { authenticate } = require("../middlewares/auth.middleware");
const { OTP_PURPOSE, ROLES } = require("../config/constants");

// ─────────────────────────────────────────────────────────
// Validation rules
// ─────────────────────────────────────────────────────────
const mobileValidation = body("mobileNo")
  .notEmpty().withMessage("Mobile number is required")
  .matches(/^[6-9]\d{9}$/).withMessage("Enter valid 10 digit Indian mobile number");

const otpValidation = body("otp")
  .notEmpty().withMessage("OTP is required")
  .isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits");

const purposeValidation = body("purpose")
  .notEmpty().withMessage("Purpose is required")
  .isIn(Object.values(OTP_PURPOSE)).withMessage("Invalid OTP purpose");

// ─────────────────────────────────────────────────────────
// @route  POST /api/auth/otp/send
// ─────────────────────────────────────────────────────────
router.post(
  "/otp/send",
  [mobileValidation, purposeValidation],
  sendOTP
);

// ─────────────────────────────────────────────────────────
// @route  POST /api/auth/otp/verify
// ─────────────────────────────────────────────────────────
router.post(
  "/otp/verify",
  [mobileValidation, otpValidation, purposeValidation],
  verifyOTP
);

// ─────────────────────────────────────────────────────────
// @route  POST /api/auth/register
// ─────────────────────────────────────────────────────────
router.post(
  "/register",
  [
    mobileValidation,
    body("role")
      .notEmpty().withMessage("Role is required")
      .isIn(Object.values(ROLES)).withMessage("Invalid role"),
    body("name")
      .notEmpty().withMessage("Name is required"),
  ],
  register
);

// ─────────────────────────────────────────────────────────
// @route  POST /api/auth/login
// ─────────────────────────────────────────────────────────
router.post(
  "/login",
  [mobileValidation],
  login
);

// ─────────────────────────────────────────────────────────
// @route  POST /api/auth/token/refresh
// ─────────────────────────────────────────────────────────
router.post(
  "/token/refresh",
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
  refreshToken
);

// ─────────────────────────────────────────────────────────
// @route  POST /api/auth/logout       (protected)
// ─────────────────────────────────────────────────────────
router.post("/logout", authenticate, logout);

// ─────────────────────────────────────────────────────────
// @route  GET  /api/auth/me           (protected)
// ─────────────────────────────────────────────────────────
router.get("/me", authenticate, getMe);

// ─────────────────────────────────────────────────────────
// @route  GET  /api/auth/registration/:regId
// ─────────────────────────────────────────────────────────
router.get("/registration/:regId", getRegistrationStatus);

// ─────────────────────────────────────────────────────────
// @route  POST /api/auth/internal/login
// ─────────────────────────────────────────────────────────
router.post(
  "/internal/login",
  [
    body("mobileNo")
      .notEmpty().withMessage("Mobile number is required"),
    body("password")
      .notEmpty().withMessage("Password is required"),
  ],
  internalLogin
);

// Add route
// ─────────────────────────────────────────────────────────
// @route  POST /api/auth/fcm-token    (protected)
// ─────────────────────────────────────────────────────────
router.post(
  "/fcm-token",
  authenticate,
  body("fcmToken").notEmpty().withMessage("FCM token is required"),
  updateFcmToken
);

module.exports = router;