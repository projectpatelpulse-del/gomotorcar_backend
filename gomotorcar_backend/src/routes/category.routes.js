
const express = require("express");
const router  = express.Router();
const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  addSubCategory,
  deleteCategory,
} = require("../controllers/category.controller");
const {
  authenticate,
  requireRole,
  requireActiveAccount,
} = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// Everyone can view categories
router.get(
  "/",
  authenticate,
  requireActiveAccount,
  getCategories
);

router.get(
  "/:id",
  authenticate,
  requireActiveAccount,
  getCategoryById
);

// Admin only
router.post(
  "/",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.IT_ADMIN),
  createCategory
);

router.put(
  "/:id",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.IT_ADMIN),
  updateCategory
);

router.post(
  "/:id/subcategory",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.IT_ADMIN),
  addSubCategory
);

router.delete(
  "/:id",
  authenticate,
  requireActiveAccount,
  requireRole(ROLES.IT_ADMIN),
  deleteCategory
);

module.exports = router;