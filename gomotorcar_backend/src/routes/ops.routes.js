const express = require("express");
const router  = express.Router();
const {
  getTeamSummary,
  onboardFranchise,
  onboardNCSP,
  onboardSupervisor,
  getBookings,
  expediteBooking,
  getGrievances,
  resolveGrievance,
  escalateGrievance,
  addGrievanceMessage,
  rateFranchise,
  getFranchiseRatings,
} = require("../controllers/ops.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");

// All routes — Operations Team only
router.use(
  authenticate,
  requireActiveAccount,
  requireRole("OT")
);

// ─── Team Summary ─────────────────────────────────────────
router.get("/team/summary", getTeamSummary);

// ─── Onboarding ───────────────────────────────────────────
router.post("/onboarding/franchise",   onboardFranchise);
router.post("/onboarding/ncsp",        onboardNCSP);
router.post("/onboarding/supervisor",  onboardSupervisor);

// ─── Bookings ─────────────────────────────────────────────
router.get ("/bookings",              getBookings);
router.post("/bookings/:id/expedite", expediteBooking);

// ─── Grievances ───────────────────────────────────────────
router.get ("/grievances",                 getGrievances);
router.post("/grievances/:id/resolve",     resolveGrievance);
router.post("/grievances/:id/escalate",    escalateGrievance);
router.post("/grievances/:id/message",     addGrievanceMessage);

// ─── Franchise Ratings ────────────────────────────────────
router.post("/franchise/:id/rate",         rateFranchise);
router.get ("/franchise/:id/ratings",      getFranchiseRatings);

module.exports = router;