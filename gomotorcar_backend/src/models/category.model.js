const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema({
  name: {
    type:     String,
    required: true,
    trim:     true,
  },
  icon: {
    type: String, // S3 URL or icon name
  },
  tags: [{
    type: String,
    trim: true,
    // Correlated names for elastic search
    // e.g. ["car wash", "cleaning", "wash"]
  }],
  isActive: {
    type:    Boolean,
    default: true,
  },
}, { _id: true });

const categorySchema = new mongoose.Schema(
  {
    // ─── Main Category ───────────────────────────────────
    name: {
      type:     String,
      required: [true, "Category name is required"],
      trim:     true,
      // e.g. "Car Wash", "Repairs", "Detailing"
    },

    icon: {
      type: String, // S3 URL or icon name
    },

    description: {
      type:  String,
      trim:  true,
    },

    // ─── Sub Categories ──────────────────────────────────
    subCategories: [subCategorySchema],

    // ─── Special Flags ───────────────────────────────────
    // For app drawer special sections
    isElectricVehicle: {
      type:    Boolean,
      default: false,
      // EV specific providers
    },

    isSOS: {
      type:    Boolean,
      default: false,
      // Roadside assistance
    },

    // ─── Display Order ───────────────────────────────────
    sortOrder: {
      type:    Number,
      default: 0,
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    isDeleted: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;