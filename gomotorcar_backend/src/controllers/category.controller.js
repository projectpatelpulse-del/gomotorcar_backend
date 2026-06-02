const Category   = require("../models/category.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");

// ─────────────────────────────────────────────────────────
// @route   POST /api/categories
// @desc    Admin creates a category
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const createCategory = asyncHandler(async (req, res) => {
  const {
    name,
    icon,
    description,
    subCategories,
    isElectricVehicle,
    isSOS,
    sortOrder,
  } = req.body;

  const category = await Category.create({
    name,
    icon,
    description,
    subCategories: subCategories || [],
    isElectricVehicle: isElectricVehicle || false,
    isSOS:             isSOS             || false,
    sortOrder:         sortOrder          || 0,
  });

  return createdResponse(
    res,
    "Category created successfully",
    { category }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/categories
// @desc    Get all categories with sub-categories
// @access  Private
// ─────────────────────────────────────────────────────────
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({
    isActive:  true,
    isDeleted: false,
  }).sort({ sortOrder: 1, name: 1 });

  return successResponse(
    res,
    "Categories fetched successfully",
    {
      count: categories.length,
      categories,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/categories/:id
// @desc    Get single category with sub-categories
// @access  Private
// ─────────────────────────────────────────────────────────
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id:       req.params.id,
    isActive:  true,
    isDeleted: false,
  });

  if (!category) {
    return errorResponse(res, "Category not found", 404);
  }

  return successResponse(
    res,
    "Category fetched successfully",
    { category }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PUT /api/categories/:id
// @desc    Admin updates a category
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!category) {
    return errorResponse(res, "Category not found", 404);
  }

  return successResponse(
    res,
    "Category updated successfully",
    { category }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/categories/:id/subcategory
// @desc    Admin adds sub-category
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const addSubCategory = asyncHandler(async (req, res) => {
  const { name, icon, tags } = req.body;

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        subCategories: { name, icon, tags },
      },
    },
    { new: true }
  );

  if (!category) {
    return errorResponse(res, "Category not found", 404);
  }

  return successResponse(
    res,
    "Sub-category added successfully",
    { category }
  );
});

// ─────────────────────────────────────────────────────────
// @route   DELETE /api/categories/:id
// @desc    Admin deletes a category
// @access  Private (IT Admin only)
// ─────────────────────────────────────────────────────────
const deleteCategory = asyncHandler(async (req, res) => {
  await Category.findByIdAndUpdate(req.params.id, {
    $set: { isDeleted: true, isActive: false },
  });

  return successResponse(res, "Category deleted successfully");
});

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  addSubCategory,
  deleteCategory,
};