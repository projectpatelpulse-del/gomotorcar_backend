const Grievance    = require("../models/grievance.model");
const User         = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");

// ─────────────────────────────────────────────────────────
// @route   POST /api/grievances
// @desc    Raise a grievance (any role)
// @access  Private
// ─────────────────────────────────────────────────────────
const raiseGrievance = asyncHandler(async (req, res) => {
  const {
    type, subject,
    description, photos,
    refId, refModel,
  } = req.body || {};

  if (!type || !subject || !description) {
    return errorResponse(
      res,
      "Type, subject and description are required",
      400
    );
  }

  const grievance = await Grievance.create({
    raisedBy:     req.user._id,
    raisedByRole: req.user.role,
    type,
    subject,
    description,
    photos:   photos   || [],
    refId:    refId    || null,
    refModel: refModel || null,
    status:   "open",
    messages: [{
      senderId:   req.user._id,
      senderRole: req.user.role,
      message:    description,
      sentAt:     new Date(),
    }],
  });

  return createdResponse(
    res,
    "Grievance raised successfully",
    {
      grievance: {
        _id:      grievance._id,
        ticketNo: grievance.ticketNo,
        status:   grievance.status,
        type:     grievance.type,
        subject:  grievance.subject,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/grievances
// @desc    Get all grievances for logged in user
// @access  Private
// ─────────────────────────────────────────────────────────
const getMyGrievances = asyncHandler(async (req, res) => {
  const {
    status,
    page = 1, limit = 10,
  } = req.query;

  const filter = {
    raisedBy:  req.user._id,
    isDeleted: false,
  };
  if (status) filter.status = status;

  const [grievances, total] = await Promise.all([
    Grievance.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Grievance.countDocuments(filter),
  ]);

  return successResponse(
    res,
    "Grievances fetched successfully",
    {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      grievances,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/grievances/:id
// @desc    Get grievance detail with full thread
// @access  Private
// ─────────────────────────────────────────────────────────
const getGrievanceById = asyncHandler(async (req, res) => {
  const grievance = await Grievance.findOne({
    _id:       req.params.id,
    isDeleted: false,
  })
    .populate("raisedBy",  "name mobileNo role partnerId")
    .populate("resolvedBy","name role");

  if (!grievance) {
    return errorResponse(res, "Grievance not found", 404);
  }

  // Build status timeline
  const timeline = [
    {
      status:    "open",
      label:     "Grievance Raised",
      timestamp: grievance.createdAt,
      completed: true,
    },
  ];

  if (grievance.status === "in_progress" ||
      grievance.status === "resolved" ||
      grievance.status === "escalated" ||
      grievance.status === "closed") {
    timeline.push({
      status:    "in_progress",
      label:     "Under Investigation",
      timestamp: grievance.updatedAt,
      completed: true,
    });
  }

  if (grievance.isEscalated) {
    timeline.push({
      status:    "escalated",
      label:     "Escalated to Admin",
      timestamp: grievance.escalatedAt,
      completed: true,
    });
  }

  if (grievance.status === "resolved" ||
      grievance.status === "closed") {
    timeline.push({
      status:    "resolved",
      label:     "Resolved",
      timestamp: grievance.resolvedAt,
      completed: true,
    });
  }

  return successResponse(
    res,
    "Grievance fetched successfully",
    {
      grievance,
      timeline,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/grievances/:id/message
// @desc    Add message to resolution thread
// @access  Private
// ─────────────────────────────────────────────────────────
const addMessage = asyncHandler(async (req, res) => {
  const { message, attachments } = req.body || {};

  if (!message) {
    return errorResponse(res, "Message is required", 400);
  }

  const grievance = await Grievance.findOneAndUpdate(
    {
      _id:       req.params.id,
      isDeleted: false,
    },
    {
      $push: {
        messages: {
          senderId:    req.user._id,
          senderRole:  req.user.role,
          message,
          attachments: attachments || [],
          sentAt:      new Date(),
        },
      },
      $set: {
        status: grievance => grievance.status === "open"
          ? "in_progress"
          : grievance.status,
      },
    },
    { new: true }
  );

  if (!grievance) {
    return errorResponse(res, "Grievance not found", 404);
  }

  // Update status to in_progress if open
  if (grievance.status === "open") {
    await Grievance.findByIdAndUpdate(req.params.id, {
      $set: { status: "in_progress" },
    });
  }

  return successResponse(
    res,
    "Message added successfully",
    {
      ticketNo: grievance.ticketNo,
      messages: grievance.messages,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/grievances/ratings/:entityType/:id
// @desc    Get aggregated ratings for entity
// @access  Private
// entityType = cleaner | franchise | ncsp
// ─────────────────────────────────────────────────────────
const getEntityRatings = asyncHandler(async (req, res) => {
  const { entityType, id } = req.params;

  const validTypes = ["cleaner", "franchise", "ncsp"];
  if (!validTypes.includes(entityType)) {
    return errorResponse(
      res,
      `Invalid entity type. Valid: ${validTypes.join(", ")}`,
      400
    );
  }

  const Rating = require("../models/rating.model");

  const ratings = await Rating.find({
    ratedEntity: id,
    entityType,
    isDeleted:   false,
  })
    .populate("ratedBy", "name role")
    .sort({ createdAt: -1 });

  const totalRatings = ratings.length;
  const avgRating    = totalRatings > 0
    ? (
        ratings.reduce((sum, r) => sum + r.stars, 0) /
        totalRatings
      ).toFixed(1)
    : 0;

  // Histogram
  const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach(r => { histogram[r.stars]++; });

  return successResponse(
    res,
    "Ratings fetched successfully",
    {
      entityType,
      entityId: id,
      summary: {
        totalRatings,
        averageRating: parseFloat(avgRating),
        histogram,
      },
      recentReviews: ratings.slice(0, 10).map(r => ({
        stars:      r.stars,
        comment:    r.comment,
        ratedBy:    r.ratedBy?.name,
        raterRole:  r.ratedBy?.role,
        createdAt:  r.createdAt,
      })),
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/grievances/ratings
// @desc    Submit a rating for cleaner/franchise/ncsp
// @access  Private
// ─────────────────────────────────────────────────────────
const submitRating = asyncHandler(async (req, res) => {
  const {
    ratedEntity,
    entityType,
    stars,
    comment,
    refId,
    refModel,
  } = req.body || {};

  if (!ratedEntity || !entityType || !stars) {
    return errorResponse(
      res,
      "ratedEntity, entityType and stars are required",
      400
    );
  }

  if (stars < 1 || stars > 5) {
    return errorResponse(
      res,
      "Stars must be between 1 and 5",
      400
    );
  }

  const Rating = require("../models/rating.model");

  // Check if already rated for this reference
  if (refId) {
    const existing = await Rating.findOne({
      ratedBy:    req.user._id,
      ratedEntity,
      refId,
      isDeleted:  false,
    });

    if (existing) {
      return errorResponse(
        res,
        "You have already rated for this reference",
        409
      );
    }
  }

  const rating = await Rating.create({
    ratedBy:    req.user._id,
    raterRole:  req.user.role,
    ratedEntity,
    entityType,
    stars,
    comment:    comment  || "",
    refId:      refId    || null,
    refModel:   refModel || null,
  });

  return createdResponse(
    res,
    "Rating submitted successfully",
    { rating }
  );
});

module.exports = {
  raiseGrievance,
  getMyGrievances,
  getGrievanceById,
  addMessage,
  getEntityRatings,
  submitRating,
};