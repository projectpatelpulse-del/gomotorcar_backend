const express = require("express");
const router  = express.Router();
const {
  submitFranchiseeProfile,
  getFranchiseeProfile,
  updateFranchiseeProfile,
} = require("../controllers/franchiseeProfile.controller");
const {
  authenticate,
  requireRole,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// All routes — FR or FS role only
router.use(
  authenticate,
  requireRole(ROLES.FRANCHISEE_CSP, ROLES.FRANCHISEE_STEAM)
);

router.post("/", submitFranchiseeProfile);
router.get  ("/", getFranchiseeProfile);
router.put  ("/", updateFranchiseeProfile);

module.exports = router;