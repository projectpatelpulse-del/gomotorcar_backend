const express = require("express");
const router  = express.Router();
const {
  verifyGST,
  payAnnualFee,
  renewAnnualFee,
  getProfile,
  updateProfile,
  updateTimings,
  getServiceCatalog,
  addService,
  removeService,
  suggestService,
  updatePricing,
  getLeads,
  getLeadById,
  updateLeadStatus,
  getLeadsSummary,
  getCostPerLead,
  createOffer,
  getOffers,
  getRatings,
  getPaymentHistory,
} = require("../controllers/ncsp.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// All NCSP routes
router.use(
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.NCSP)
);

// ─── Registration ─────────────────────────────────────────
router.post("/verify-gst",       verifyGST);
router.post("/payment/annual-fee",payAnnualFee);
router.post("/payment/renew",    renewAnnualFee);

// ─── Profile ──────────────────────────────────────────────
router.get ("/profile",           getProfile);
router.put ("/profile",           updateProfile);
router.put ("/profile/timings",   updateTimings);

// ─── Services ─────────────────────────────────────────────
router.get ("/services/catalog",       getServiceCatalog);
router.post("/services",               addService);
router.delete("/services/:serviceId",  removeService);
router.post("/services/suggest",       suggestService);

// ─── Pricing ──────────────────────────────────────────────
router.put("/pricing", updatePricing);

// ─── Leads ────────────────────────────────────────────────
router.get  ("/leads/summary",       getLeadsSummary);
router.get  ("/leads/cost-per-lead", getCostPerLead);
router.get  ("/leads",               getLeads);
router.get  ("/leads/:id",           getLeadById);
router.patch("/leads/:id/status",    updateLeadStatus);

// ─── Offers ───────────────────────────────────────────────
router.post("/offers",  createOffer);
router.get ("/offers",  getOffers);

// ─── Ratings ──────────────────────────────────────────────
router.get("/ratings",  getRatings);

// ─── Payments ─────────────────────────────────────────────
router.get("/payments", getPaymentHistory);

module.exports = router;