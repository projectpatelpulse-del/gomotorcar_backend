const express = require("express");
const router  = express.Router();
const {
  getSupervisorHome,
  getOnboardingQueue,
  onboardQRScan,
  reassignQR,
  getOnboardingList,
  addCleaner,
  getCleaners,
  assignCleaner,
  getWorkSchedule,
  getApprovalQueue,
  approveWork,
  redoWork,
  rejectWork,
  getCustomerRejections,
  actionOnRejection,
  getQRStock,
  requestQRBatch,
  getSupervisorInventory,
  allocateInventory,
} = require("../controllers/supervisor.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// All routes — Supervisor only
router.use(
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.SUPERVISOR)
);

// ─── Dashboard ────────────────────────────────────────────
router.get("/home", getSupervisorHome);

// ─── Onboarding ───────────────────────────────────────────
router.get  ("/onboarding/queue",       getOnboardingQueue);
router.post ("/onboarding/qr-scan",     onboardQRScan);
router.post ("/onboarding/qr-reassign", reassignQR);
router.get  ("/onboarding/list",        getOnboardingList);

// ─── Cleaners ─────────────────────────────────────────────
router.post("/cleaners",                          addCleaner);
router.get ("/cleaners",                          getCleaners);
router.post("/subscriptions/:id/assign-cleaner",  assignCleaner);

// ─── Work ─────────────────────────────────────────────────
router.get ("/work/schedule",                      getWorkSchedule);
router.get ("/work/approval-queue",                getApprovalQueue);
router.post("/work/:sessionId/approve",            approveWork);
router.post("/work/:sessionId/redo",               redoWork);
router.post("/work/:sessionId/reject",             rejectWork);

// ─── Customer Rejections ──────────────────────────────────
router.get ("/customer-rejections",          getCustomerRejections);
router.post("/customer-rejections/:id/action", actionOnRejection);

// ─── QR Stock ─────────────────────────────────────────────
router.get ("/qr-stock",         getQRStock);
router.post("/qr-stock/request", requestQRBatch);

// ─── Inventory ────────────────────────────────────────────
router.get ("/inventory",          getSupervisorInventory);
router.post("/inventory/allocate", allocateInventory);

module.exports = router;