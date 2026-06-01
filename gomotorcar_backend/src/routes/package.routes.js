const express = require("express");
const router  = express.Router();
const {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
} = require("../controllers/package.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// Customer can view packages
router.get(
  "/",
  authenticate,
  requireActiveAccount,
  getPackages
);

router.get(
  "/:id",
  authenticate,
  requireActiveAccount,
  getPackageById
);

// Admin only — create, update, delete
router.post(
  "/",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.IT_ADMIN),
  createPackage
);

router.put(
  "/:id",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.IT_ADMIN),
  updatePackage
);

router.delete(
  "/:id",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.IT_ADMIN),
  deletePackage
);

module.exports = router;