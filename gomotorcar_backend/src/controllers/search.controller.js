const NCSPProfile  = require("../models/ncspProfile.model");
const Category     = require("../models/category.model");
const Lead         = require("../models/lead.model");
const User         = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse,
  errorResponse,
} = require("../utils/responseHandler");
const { SEARCH_RANGE_KM } = require("../config/constants");

// ─────────────────────────────────────────────────────────
// @route   GET /api/search/categories
// @desc    Get all categories for search homepage
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const getSearchCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({
    isActive:          true,
    isDeleted:         false,
    isElectricVehicle: false,
    isSOS:             false,
  })
    .select("name icon subCategories sortOrder")
    .sort({ sortOrder: 1 });

  return successResponse(
    res,
    "Search categories fetched successfully",
    {
      count: categories.length,
      categories,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/search/services
// @desc    Search services by text + geo range
// @access  Private (Customer)
// Query params: q, lat, lng, range, locationType
// ─────────────────────────────────────────────────────────
const searchServices = asyncHandler(async (req, res) => {
  const {
    q,           // search text
    lat,         // latitude
    lng,         // longitude
    range,       // 10, 15, 25 (km)
    locationType // current, home, work, other
  } = req.query;

  if (!lat || !lng) {
    return errorResponse(
      res,
      "Location (lat, lng) is required for search",
      400
    );
  }

  // Range in meters — default 10km as per document
  const rangeKm = parseInt(range) || SEARCH_RANGE_KM.DEFAULT;
  const rangeMeters = rangeKm * 1000;

  // Build geo query
  const geoQuery = {
    location: {
      $near: {
        $geometry: {
          type:        "Point",
          coordinates: [
            parseFloat(lng),
            parseFloat(lat),
          ],
        },
        $maxDistance: rangeMeters,
      },
    },
    appStatus: "active",
    isDeleted: false,
  };

  // Add text search if query provided
  if (q && q.trim()) {
    geoQuery.$or = [
      { businessName: { $regex: q, $options: "i" } },
      { "services.serviceName": { $regex: q, $options: "i" } },
    ];
  }

  const providers = await NCSPProfile.find(geoQuery)
    .populate("userId", "name mobileNo")
    .select(
      "businessName logoImage services location " +
      "workingHours contactPersonName contactPersonMobile"
    )
    .limit(20);

  // Calculate distance for each provider
  const providersWithDistance = providers.map((provider) => {
    const coords = provider.location.coordinates;
    const distance = calculateDistance(
      parseFloat(lat),
      parseFloat(lng),
      coords[1], // latitude
      coords[0]  // longitude
    );

    return {
      _id:          provider._id,
      businessName: provider.businessName,
      logoImage:    provider.logoImage,
      services:     provider.services.slice(0, 3), // top 3 services
      contactPerson: provider.contactPersonName,
      contactMobile: provider.contactPersonMobile,
      distance:      `${distance.toFixed(1)} km`,
      distanceValue: distance,
      workingHours:  provider.workingHours,
    };
  });

  // Sort by distance
  providersWithDistance.sort(
    (a, b) => a.distanceValue - b.distanceValue
  );

  return successResponse(
    res,
    "Search results fetched successfully",
    {
      query:       q || "",
      range:       `${rangeKm} km`,
      count:       providersWithDistance.length,
      providers:   providersWithDistance,
      expandRange: getNextRange(rangeKm),
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/search/providers
// @desc    Get NCSP list by service + geo location
// @access  Private (Customer)
// Query: serviceId, lat, lng, range
// ─────────────────────────────────────────────────────────
const getProviders = asyncHandler(async (req, res) => {
  const { lat, lng, range, serviceName } = req.query;

  if (!lat || !lng) {
    return errorResponse(
      res,
      "Location (lat, lng) is required",
      400
    );
  }

  const rangeKm     = parseInt(range) || SEARCH_RANGE_KM.DEFAULT;
  const rangeMeters = rangeKm * 1000;

  const query = {
    location: {
      $near: {
        $geometry: {
          type:        "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: rangeMeters,
      },
    },
    appStatus: "active",
    isDeleted: false,
  };

  // Filter by service name if provided
  if (serviceName) {
    query["services.serviceName"] = {
      $regex:   serviceName,
      $options: "i",
    };
  }

  const providers = await NCSPProfile.find(query)
    .populate("userId", "name mobileNo")
    .select(
      "businessName logoImage businessAddress " +
      "services contactPersonName contactPersonMobile " +
      "workingHours location"
    )
    .limit(20);

  // Add distance
  const result = providers.map((p) => {
    const coords   = p.location.coordinates;
    const distance = calculateDistance(
      parseFloat(lat), parseFloat(lng),
      coords[1], coords[0]
    );

    return {
      _id:           p._id,
      businessName:  p.businessName,
      logoImage:     p.logoImage,
      address:       p.businessAddress,
      contactPerson: p.contactPersonName,
      contactMobile: p.contactPersonMobile,
      services:      p.services,
      workingHours:  p.workingHours,
      distance:      `${distance.toFixed(1)} km`,
      distanceValue: distance,
    };
  });

  result.sort((a, b) => a.distanceValue - b.distanceValue);

  return successResponse(
    res,
    "Providers fetched successfully",
    {
      range:       `${rangeKm} km`,
      count:       result.length,
      providers:   result,
      expandRange: getNextRange(rangeKm),
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/search/providers/:id
// @desc    Get single provider full details
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const getProviderById = asyncHandler(async (req, res) => {
  const provider = await NCSPProfile.findOne({
    _id:       req.params.id,
    isDeleted: false,
  }).populate(
    "userId",
    "name mobileNo profilePic"
  );

  if (!provider) {
    return errorResponse(res, "Provider not found", 404);
  }

  // WhatsApp link
  const whatsappLink = provider.contactPersonMobile
    ? `https://wa.me/91${provider.contactPersonMobile}`
    : null;

  return successResponse(
    res,
    "Provider details fetched successfully",
    {
      provider: {
        _id:               provider._id,
        businessName:      provider.businessName,
        ownerName:         provider.ownerName,
        contactPerson:     provider.contactPersonName,
        contactMobile:     provider.contactPersonMobile,
        businessEmail:     provider.businessEmail,
        businessAddress:   provider.businessAddress,
        services:          provider.services,
        businessImages:    provider.businessImages,
        logoImage:         provider.logoImage,
        workingHours:      provider.workingHours,
        workingDays:       provider.workingDays,
        whatsappLink,
        appStatus:         provider.appStatus,
      },
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/search/contact
// @desc    Log customer contact as lead for NCSP
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const logContact = asyncHandler(async (req, res) => {
  const {
    providerId,
    channel,       // "call" or "whatsapp"
    serviceInterest,
    lat,
    lng,
  } = req.body;

  // Check provider exists
  const provider = await NCSPProfile.findOne({
    _id:       providerId,
    isDeleted: false,
  });

  if (!provider) {
    return errorResponse(res, "Provider not found", 404);
  }

  // Create lead
  const lead = await Lead.create({
    customerId:      req.user._id,
    providerId:      provider.userId,
    ncspProfileId:   provider._id,
    channel,
    serviceInterest: serviceInterest || "",
    status:          "new",
    searchLocation: {
      type:        "Point",
      coordinates: [
        parseFloat(lng) || 0,
        parseFloat(lat) || 0,
      ],
    },
  });

  // Return contact details for the app to use
  const contactDetails = {
    leadId:        lead._id,
    channel,
    contactMobile: provider.contactPersonMobile,
    whatsappLink:  channel === "whatsapp"
      ? `https://wa.me/91${provider.contactPersonMobile}`
      : null,
  };

  return successResponse(
    res,
    "Contact logged successfully",
    { contactDetails }
  );
});

// ─────────────────────────────────────────────────────────
// @route   POST /api/search/providers/:id/rate
// @desc    Customer rates an NCSP provider
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const rateProvider = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return errorResponse(
      res,
      "Rating must be between 1 and 5",
      400
    );
  }

  const provider = await NCSPProfile.findOne({
    _id:       req.params.id,
    isDeleted: false,
  });

  if (!provider) {
    return errorResponse(res, "Provider not found", 404);
  }

  // For now storing rating in lead
  // Full ratings module in Phase 13
  await Lead.findOneAndUpdate(
    {
      customerId: req.user._id,
      providerId: provider.userId,
    },
    {
      $set: {
        status: "converted",
        notes:  comment || "",
      },
    },
    { sort: { createdAt: -1 } }
  );

  return successResponse(
    res,
    "Rating submitted successfully",
    {
      providerId: req.params.id,
      rating,
      comment,
    }
  );
});

// ─────────────────────────────────────────────────────────
// @route   GET /api/search/electric-vehicles
// @desc    Get EV specific service providers
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const getElectricVehicleProviders = asyncHandler(
  async (req, res) => {
    const { lat, lng } = req.query;

    // Get EV category
    const evCategory = await Category.findOne({
      isElectricVehicle: true,
      isActive:          true,
      isDeleted:         false,
    });

    // Search NCSP providers with EV services
    const query = {
      appStatus:  "active",
      isDeleted:  false,
      "services.serviceName": {
        $regex:   "electric|EV|battery",
        $options: "i",
      },
    };

    // Add geo if location provided
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type:        "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: SEARCH_RANGE_KM.MAX * 1000,
        },
      };
    }

    const providers = await NCSPProfile.find(query)
      .select(
        "businessName logoImage services " +
        "contactPersonName contactPersonMobile workingHours"
      )
      .limit(20);

    return successResponse(
      res,
      "EV providers fetched successfully",
      {
        count:     providers.length,
        providers,
      }
    );
  }
);

// ─────────────────────────────────────────────────────────
// @route   GET /api/search/sos
// @desc    SOS / roadside assistance near location
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────
const getSOSProviders = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return errorResponse(
      res,
      "Location (lat, lng) is required for SOS search",
      400
    );
  }

  // Search providers with roadside/SOS services
  const providers = await NCSPProfile.find({
    location: {
      $near: {
        $geometry: {
          type:        "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: SEARCH_RANGE_KM.MAX * 1000,
      },
    },
    appStatus: "active",
    isDeleted: false,
    "services.serviceName": {
      $regex:   "roadside|SOS|towing|puncture|emergency",
      $options: "i",
    },
  })
    .select(
      "businessName contactPersonName " +
      "contactPersonMobile location"
    )
    .limit(10);

  // Add distance
  const result = providers.map((p) => {
    const coords   = p.location.coordinates;
    const distance = calculateDistance(
      parseFloat(lat), parseFloat(lng),
      coords[1], coords[0]
    );
    return {
      _id:           p._id,
      businessName:  p.businessName,
      contactPerson: p.contactPersonName,
      contactMobile: p.contactPersonMobile,
      distance:      `${distance.toFixed(1)} km`,
      distanceValue: distance,
    };
  });

  result.sort((a, b) => a.distanceValue - b.distanceValue);

  return successResponse(
    res,
    "SOS providers fetched successfully",
    {
      count:     result.length,
      providers: result,
    }
  );
});

// ─────────────────────────────────────────────────────────
// HELPER: Calculate distance between 2 coordinates (km)
// Using Haversine formula
// ─────────────────────────────────────────────────────────
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R    = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => (value * Math.PI) / 180;

// ─────────────────────────────────────────────────────────
// HELPER: Get next range for expand button
// Document: 10 → 15 → 25 km
// ─────────────────────────────────────────────────────────
const getNextRange = (currentRange) => {
  if (currentRange <= SEARCH_RANGE_KM.DEFAULT)
    return SEARCH_RANGE_KM.EXPANDED;
  if (currentRange <= SEARCH_RANGE_KM.EXPANDED)
    return SEARCH_RANGE_KM.MAX;
  return null; // Already at max range
};

module.exports = {
  getSearchCategories,
  searchServices,
  getProviders,
  getProviderById,
  logContact,
  rateProvider,
  getElectricVehicleProviders,
  getSOSProviders,
};