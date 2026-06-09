const express = require("express");
const router  = express.Router();
const {
  getCleanerHome,
  getCleanerApartments,
  getWorkSchedule,
  scanQRCode,
  startWork,
  endWork,
  offlineSync,
  getApprovalStatus,
  getAssignedVsCompleted,
  getEarnings,
  getEarningsBalance,
  getPayments,
  getCleanerRatings,
  getInventory,
  acceptInventory,
  rejectInventory,
  getCautions,
  raiseGrievance,
  getGrievances,
} = require("../controllers/cleaner.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// All routes — Car Cleaner only
router.use(
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.CAR_CLEANER)
);

// ─── Dashboard ────────────────────────────────────────────
router.get("/home",                  getCleanerHome);
router.get("/apartments",            getCleanerApartments);

// ─── Work ─────────────────────────────────────────────────
router.get ("/work/schedule",         getWorkSchedule);
router.post("/work/scan",             scanQRCode);
router.post("/work/:sessionId/start", startWork);
router.post("/work/:sessionId/end",   endWork);
router.post("/work/offline-sync",     offlineSync);
router.get ("/work/approval-status",  getApprovalStatus);
router.get (
  "/work/assigned-vs-completed",
  getAssignedVsCompleted
);

// ─── Earnings ─────────────────────────────────────────────
router.get("/earnings",          getEarnings);
router.get("/earnings/balance",  getEarningsBalance);
router.get("/payments",          getPayments);
router.get("/ratings",           getCleanerRatings);

// ─── Inventory ────────────────────────────────────────────
router.get ("/inventory",                getInventory);
router.post("/inventory/:id/accept",     acceptInventory);
router.post("/inventory/:id/reject",     rejectInventory);

// ─── Cautions & Grievances ────────────────────────────────
router.get ("/cautions",    getCautions);
router.post("/grievances",  raiseGrievance);
router.get ("/grievances",  getGrievances);

module.exports = router;