const express = require("express");
const router  = express.Router();
const {
  getAllUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  createInternalUser,
  activateUser,
  deactivateUser,
} = require("../controllers/admin.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

const {
  getCleanerProfileByAdmin,
} = require("../controllers/cleanerProfile.controller");

const {
  getNCSPProfileByAdmin,
} = require("../controllers/ncspProfile.controller");

const {
  getFranchiseeProfileByAdmin,
} = require("../controllers/franchiseeProfile.controller");


// All admin routes — IT admin only
router.use(authenticate, requireActiveAccount, requireRole(ROLES.IT_ADMIN));

router.get  ("/users",                  getAllUsers);
router.get  ("/users/pending",          getPendingUsers);
router.post ("/users/create",           createInternalUser);
router.put  ("/users/:id/approve",      approveUser);
router.put  ("/users/:id/reject",       rejectUser);
router.put  ("/users/:id/activate",     activateUser);
router.put  ("/users/:id/deactivate",   deactivateUser);

// ─── Admin views role profiles for approval ───────────────
router.get(
  "/cleaner/:userId/profile",
  getCleanerProfileByAdmin
);

router.get(
  "/ncsp/:userId/profile",
  getNCSPProfileByAdmin
);

router.get(
  "/franchisee/:userId/profile",
  getFranchiseeProfileByAdmin
);

module.exports = router;