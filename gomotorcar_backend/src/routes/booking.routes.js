const express = require("express");
const router  = express.Router();
const {
  getServices,
  getFranchises,
  getSlots,
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
  approveJobCard,
  payBooking,
  getInvoice,
  rateBooking,
  createService,
} = require("../controllers/booking.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// ─── Service Catalog ──────────────────────────────────────
// Anyone authenticated can view services
router.get(
  "/services",
  authenticate,
  requireActiveAccount,
  getServices
);

// Admin creates services
router.post(
  "/services",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.IT_ADMIN),
  createService
);

// ─── Customer Booking Routes ──────────────────────────────
// All below = Customer only
router.get(
  "/franchises",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER),
  getFranchises
);

router.get(
  "/slots",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER),
  getSlots
);

router.post(
  "/",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER),
  createBooking
);

router.get(
  "/",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER),
  getBookings
);

router.get(
  "/:id",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER),
  getBookingById
);

router.post(
  "/:id/cancel",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER),
  cancelBooking
);

router.post(
  "/:id/jobcard/approve",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER),
  approveJobCard
);

router.post(
  "/:id/pay",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER),
  payBooking
);

router.get(
  "/:id/invoice",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER),
  getInvoice
);

router.post(
  "/:id/rate",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CUSTOMER),
  rateBooking
);

module.exports = router;