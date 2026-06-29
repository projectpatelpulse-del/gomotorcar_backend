const express = require("express");
const router  = express.Router();
const {
  getProfile,
  updateProfile,
  addService,
  removeService,
  updatePricing,
  getBookings,
  getBookingById,
  respondToBooking,
  updateBookingStatus,
  closeBooking,
  modifyJobCard,
  addWarranty,
  getOrderSummary,
  getWallet,
  getTimings,
  updateTimings,
  getSlots,
  blockSlot,
  getRatings,
} = require("../controllers/franchise.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// All routes — Franchise (FR + FS) only
// const franchiseAuth = [
//   authenticate,
//   requireActiveAccount,
//   requireRole([ROLES.FRANCHISE_CSP, ROLES.FRANCHISE_STEAM]),
// ];
const franchiseAuth = [
  authenticate,
  requireActiveAccount,
  requireRole(["FR", "FS"]),
];

// ─── Profile ──────────────────────────────────────────────
router.get ("/profile",                ...franchiseAuth, getProfile);
router.put ("/profile",                ...franchiseAuth, updateProfile);
router.post("/services",               ...franchiseAuth, addService);
router.delete("/services/:serviceId",  ...franchiseAuth, removeService);
router.put ("/pricing",                ...franchiseAuth, updatePricing);

// ─── Bookings ─────────────────────────────────────────────
router.get ("/bookings",               ...franchiseAuth, getBookings);
router.get ("/bookings/:id",           ...franchiseAuth, getBookingById);
router.post("/bookings/:id/respond",   ...franchiseAuth, respondToBooking);
router.put ("/bookings/:id/status",    ...franchiseAuth, updateBookingStatus);
router.post("/bookings/:id/close",     ...franchiseAuth, closeBooking);

// ─── Job Card ─────────────────────────────────────────────
router.post("/bookings/:id/jobcard",          ...franchiseAuth, modifyJobCard);
router.post("/bookings/:id/jobcard/warranty", ...franchiseAuth, addWarranty);

// ─── Order Summary ────────────────────────────────────────
router.get("/order-summary",  ...franchiseAuth, getOrderSummary);

// ─── Wallet ───────────────────────────────────────────────
router.get("/wallet",         ...franchiseAuth, getWallet);

// ─── Timings + Slots ──────────────────────────────────────
router.get ("/timings",       ...franchiseAuth, getTimings);
router.put ("/timings",       ...franchiseAuth, updateTimings);
router.get ("/slots",         ...franchiseAuth, getSlots);
router.post("/slots/block",   ...franchiseAuth, blockSlot);

// ─── Ratings ──────────────────────────────────────────────
router.get("/ratings",        ...franchiseAuth, getRatings);

module.exports = router;