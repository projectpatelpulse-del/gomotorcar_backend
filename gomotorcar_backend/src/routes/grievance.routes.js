const express = require("express");
const router  = express.Router();
const {
  raiseGrievance,
  getMyGrievances,
  getGrievanceById,
  addMessage,
  getEntityRatings,
  submitRating,
} = require("../controllers/grievance.controller");
const {
  authenticate,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");

// All routes — any authenticated user
router.use(authenticate, requireActiveAccount);

// ─── Grievances ───────────────────────────────────────────
router.post("/",          raiseGrievance);
router.get  ("/",          getMyGrievances);
router.get  ("/:id",       getGrievanceById);
router.post ("/:id/message",addMessage);

// ─── Ratings ──────────────────────────────────────────────
router.post("/ratings",                    submitRating);
router.get ("/ratings/:entityType/:id",    getEntityRatings);

module.exports = router;