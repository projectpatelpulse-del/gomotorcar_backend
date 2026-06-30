const Notification = require("../models/notification.model");
const User         = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
  createdResponse,
} = require("../utils/responseHandler");

// ─────────────────────────────────────────────────────────
// HELPER: Send notification to user
// Will be replaced with FCM in production
// ─────────────────────────────────────────────────────────
const sendNotification = async ({
  userId,
  title,
  message,
  type,
  refId,
  refModel,
}) => {
  try {
    await Notification.create({
      userId,
      title,
      message,
      type:    type    || "general",
      refId:   refId   || null,
      refModel:refModel || null,
      isRead:  false,
    });

    // In production: send FCM push here
    // const fcmToken = await User.findById(userId).select("fcmToken");
    // if (fcmToken) await sendFCMPush(fcmToken, title, message);

  } catch (err) {
    console.error("Notification error:", err.message);
  }
};

// ─────────────────────────────────────────────────────────
// @route   POST /api/notifications/fcm-token
// @desc    Register FCM device token
// @access  Private
// ─────────────────────────────────────────────────────────
const registerFCMToken = asyncHandler(async (req, res) => {
  const { fcmToken, deviceType } = req.body || {};

  if (!fcmToken) {
    return errorResponse(res, "FCM token is required", 400);
  }

  await User.findByIdAndUpdate(req.user._id, {
    $set: { fcmToken, deviceType },
  });

  return successResponse(
    res,
    "FCM token registered successfully",
    { fcmToken }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/notifications
// @desc    Get notification feed for logged in user
// @access  Private
// ─────────────────────────────────────────────────────────
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({
      userId:    req.user._id,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    Notification.countDocuments({
      userId:    req.user._id,
      isDeleted: false,
    }),
    Notification.countDocuments({
      userId:    req.user._id,
      isRead:    false,
      isDeleted: false,
    }),
  ]);

  return successResponse(
    res,
    "Notifications fetched successfully",
    {
      total,
      unreadCount,
      page:          parseInt(page),
      totalPages:    Math.ceil(total / parseInt(limit)),
      notifications,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PATCH /api/notifications/:id/read
// @desc    Mark single notification as read
// @access  Private
// ─────────────────────────────────────────────────────────
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id:       req.params.id,
      userId:    req.user._id,
      isDeleted: false,
    },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );

  if (!notification) {
    return errorResponse(res, "Notification not found", 404);
  }

  return successResponse(
    res,
    "Notification marked as read",
    { notification }
  );
});

// ─────────────────────────────────────────────────────────
// @route   PATCH /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
// ─────────────────────────────────────────────────────────
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    {
      userId:    req.user._id,
      isRead:    false,
      isDeleted: false,
    },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return successResponse(
    res,
    "All notifications marked as read",
    { updatedCount: result.modifiedCount }
  );
});

// ─────────────────────────────────────────────────────────
// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
// ─────────────────────────────────────────────────────────
const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { isDeleted: true } }
  );

  return successResponse(res, "Notification deleted successfully");
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
// ─────────────────────────────────────────────────────────
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    userId:    req.user._id,
    isRead:    false,
    isDeleted: false,
  });

  return successResponse(
    res,
    "Unread count fetched",
    { unreadCount: count }
  );
});

module.exports = {
  registerFCMToken,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  sendNotification, // Export helper for other modules
};