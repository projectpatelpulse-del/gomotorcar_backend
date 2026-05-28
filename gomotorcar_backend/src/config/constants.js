// ═══════════════════════════════════════════════════════════
// GoMotorCar — Central Constants File
// Single source of truth for entire backend
// Never hardcode any of these values anywhere else
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// USER ROLES
// These are the role codes used across entire project
// CU = Customer        → self register → direct active
// CL = Car Cleaner     → self register → needs approval
// SU = Supervisor      → admin creates → direct active
// NC = NCSP            → self register → needs approval
// FR = Franchisee CSP  → self register → needs approval
// FS = Franchise Steam → self register → needs approval
// OT = Operations Team → admin creates → direct active
// IT = IT Admin        → admin creates → direct active
// ─────────────────────────────────────────────────────────
const ROLES = {
  CUSTOMER:          "CU",
  CAR_CLEANER:       "CL",
  SUPERVISOR:        "SU",
  NCSP:              "NC",
  FRANCHISEE_CSP:    "FR",
  FRANCHISEE_STEAM:  "FS",
  OPERATIONS_TEAM:   "OT",
  IT_ADMIN:          "IT",
};

// ─────────────────────────────────────────────────────────
// USER STATUS
// Lifecycle of every user account
// pending_approval → approved → active
// pending_approval → rejected
// active → inactive (admin deactivates)
// ─────────────────────────────────────────────────────────
const USER_STATUS = {
  PENDING_APPROVAL: "pending_approval",
  APPROVED:         "approved",
  REJECTED:         "rejected",
  ACTIVE:           "active",
  INACTIVE:         "inactive",
};

// ─────────────────────────────────────────────────────────
// ENTITY TYPE
// How a partner registers
// individual = single person e.g. Car Cleaner, NCSP
// company    = business with GST e.g. Franchise, NCSP
// ─────────────────────────────────────────────────────────
const ENTITY_TYPE = {
  INDIVIDUAL: "individual",
  COMPANY:    "company",
};

// ─────────────────────────────────────────────────────────
// OTP PURPOSE
// What the OTP is being used for
// ─────────────────────────────────────────────────────────
const OTP_PURPOSE = {
  REGISTRATION: "registration",
  LOGIN:        "login",
  RESET:        "reset",
};

// ─────────────────────────────────────────────────────────
// ROLE GROUPINGS
// Used in auth controller and middleware logic
// ─────────────────────────────────────────────────────────

// Roles that register themselves via OTP flow
const SELF_REGISTER_ROLES = [
  ROLES.CUSTOMER,
  ROLES.CAR_CLEANER,
  ROLES.NCSP,
  ROLES.FRANCHISEE_CSP,
  ROLES.FRANCHISEE_STEAM,
];

// Roles created by IT Admin only — no self registration
const ADMIN_CREATED_ROLES = [
  ROLES.SUPERVISOR,
  ROLES.OPERATIONS_TEAM,
  ROLES.IT_ADMIN,
];

// Roles that go to pending_approval after registration
// Customer is excluded → directly active
const REQUIRES_APPROVAL_ROLES = [
  ROLES.CAR_CLEANER,
  ROLES.NCSP,
  ROLES.FRANCHISEE_CSP,
  ROLES.FRANCHISEE_STEAM,
];

// Roles where only one device session allowed at a time
// Car Cleaner must not share login with anyone
const SINGLE_SESSION_ROLES = [
  ROLES.CAR_CLEANER,
];

// Roles that are GoMotorCar internal team
const INTERNAL_ROLES = [
  ROLES.SUPERVISOR,
  ROLES.OPERATIONS_TEAM,
  ROLES.IT_ADMIN,
];

// Roles that are external partners or customers
const EXTERNAL_ROLES = [
  ROLES.CUSTOMER,
  ROLES.CAR_CLEANER,
  ROLES.NCSP,
  ROLES.FRANCHISEE_CSP,
  ROLES.FRANCHISEE_STEAM,
];

// ─────────────────────────────────────────────────────────
// VEHICLE CONSTANTS
// Used in vehicle.model.js
// ─────────────────────────────────────────────────────────
const VEHICLE_CATEGORY = {
  HATCHBACK: "hatchback",
  SEDAN:     "sedan",
  SUV:       "suv",
  LUXURY:    "luxury",
  OTHER:     "other",
};

const FUEL_TYPE = {
  PETROL:   "petrol",
  DIESEL:   "diesel",
  CNG:      "cng",
  ELECTRIC: "electric",
  HYBRID:   "hybrid",
};

// ─────────────────────────────────────────────────────────
// ADDRESS CONSTANTS
// Used in address.model.js and address.controller.js
// ─────────────────────────────────────────────────────────
const ADDRESS_TYPE = {
  HOME:  "home",
  WORK:  "work",
  OTHER: "other",
};

// ─────────────────────────────────────────────────────────
// CAR CLEANER CONSTANTS
// Used in Phase 3 cleaning module
// Part time → max 15 cars, 3hr slot
// Full time → max 30 cars, 6hr slot
// ─────────────────────────────────────────────────────────
const CLEANER_TYPE = {
  PART_TIME: "part_time",
  FULL_TIME: "full_time",
};

const CLEANER_CAPACITY = {
  PART_TIME_MAX_CARS:    15,
  FULL_TIME_MAX_CARS:    30,
  PART_TIME_ALERT_AT:    10, // alert before capacity expires
  FULL_TIME_ALERT_AT:    25,
  PART_TIME_WORK_HOURS:  3,
  FULL_TIME_WORK_HOURS:  6,
};

const CLEANING_TYPE = {
  EXTERNAL: "external",
  INTERNAL: "internal",
};

// ─────────────────────────────────────────────────────────
// SUBSCRIPTION CONSTANTS
// Used in Phase 3 subscription module
// Matches the UI — Monthly Elite, cleaning balance etc
// ─────────────────────────────────────────────────────────
const SUBSCRIPTION_STATUS = {
  ACTIVE:   "active",
  EXPIRED:  "expired",
  PAUSED:   "paused",
  CANCELLED:"cancelled",
};

const SUBSCRIPTION_TYPE = {
  GENERAL:          "general",
  APARTMENT_WISE:   "apartment_wise",
};

// ─────────────────────────────────────────────────────────
// BOOKING CONSTANTS
// Used in Phase 5 booking module
// Matches the UI tracking stages
// ─────────────────────────────────────────────────────────
const BOOKING_STATUS = {
  PENDING:    "pending",
  CONFIRMED:  "confirmed",
  ASSIGNED:   "assigned",
  IN_TRANSIT: "in_transit",
  STARTED:    "started",
  COMPLETED:  "completed",
  CANCELLED:  "cancelled",
};

const SERVICE_MODE = {
  AT_WORKS:   "at_works",    // customer brings car to workshop
  DOOR_STEP:  "door_step",   // service done at customer location
  PICKUP_DROP:"pickup_drop", // franchise picks up and drops
};

const PAYMENT_MODE = {
  ONLINE:  "online",
  CASH:    "cash",
  WALLET:  "wallet",
};

const PAYMENT_STATUS = {
  PENDING:   "pending",
  SUCCESS:   "success",
  FAILED:    "failed",
  REFUNDED:  "refunded",
};

// ─────────────────────────────────────────────────────────
// FRANCHISE / CSP CONSTANTS
// Used in Phase 3 franchise module
// ─────────────────────────────────────────────────────────
const FRANCHISE_TYPE = {
  CSP:        "csp",         // geo location based search
  STEAM_WASH: "steam_wash",  // pin code based search
};

const FRANCHISE_STATUS = {
  ACTIVE:   "active",    // open to accept bookings
  INACTIVE: "inactive",  // not accepting bookings
};

// ─────────────────────────────────────────────────────────
// NCSP CONSTANTS
// Used in Phase 4 NCSP module
// ─────────────────────────────────────────────────────────
const NCSP_APP_STATUS = {
  ACTIVE:   "active",   // appears in customer search
  INACTIVE: "inactive", // hidden from customer search
};

// ─────────────────────────────────────────────────────────
// GRIEVANCE CONSTANTS
// Used in Phase 5 grievance module
// ─────────────────────────────────────────────────────────
const GRIEVANCE_STATUS = {
  OPEN:       "open",
  IN_PROGRESS:"in_progress",
  RESOLVED:   "resolved",
  ESCALATED:  "escalated",
  CLOSED:     "closed",
};

const GRIEVANCE_TYPE = {
  CLEANING_ISSUE:  "cleaning_issue",
  PAYMENT_ISSUE:   "payment_issue",
  SERVICE_ISSUE:   "service_issue",
  APP_ISSUE:       "app_issue",
  OTHER:           "other",
};

// ─────────────────────────────────────────────────────────
// QR CODE CONSTANTS
// Used in Phase 3 QR module
// ─────────────────────────────────────────────────────────
const QR_STATUS = {
  UNALLOCATED: "unallocated",
  ALLOCATED:   "allocated",
  ACTIVE:      "active",
  INACTIVE:    "inactive",
};

// ─────────────────────────────────────────────────────────
// NOTIFICATION CONSTANTS
// Used in Phase 9 notifications module
// ─────────────────────────────────────────────────────────
const NOTIFICATION_TYPE = {
  BOOKING_STATUS:      "booking_status",
  SERVICE_STATUS:      "service_status",
  PAYMENT_STATUS:      "payment_status",
  CLEANING_DONE:       "cleaning_done",
  OFFER:               "offer",
  APPROVAL:            "approval",
  GRIEVANCE_UPDATE:    "grievance_update",
  PACKAGE_RENEWAL:     "package_renewal",
  GENERAL:             "general",
};

// ─────────────────────────────────────────────────────────
// SEARCH CONSTANTS
// Used in Phase 4 NCSP search module
// Range steps as per document
// ─────────────────────────────────────────────────────────
const SEARCH_RANGE_KM = {
  DEFAULT:  10,  // Step 1 — within 10km by default
  EXPANDED: 15,  // Step 2 — expand range
  MAX:      25,  // Step 3 — maximum range
};

// ─────────────────────────────────────────────────────────
// PAGINATION DEFAULTS
// Used across all list APIs
// ─────────────────────────────────────────────────────────
const PAGINATION = {
  DEFAULT_PAGE:  1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT:     100,
};

// ─────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────
module.exports = {
  // User
  ROLES,
  USER_STATUS,
  ENTITY_TYPE,
  OTP_PURPOSE,

  // Role groupings
  SELF_REGISTER_ROLES,
  ADMIN_CREATED_ROLES,
  REQUIRES_APPROVAL_ROLES,
  SINGLE_SESSION_ROLES,
  INTERNAL_ROLES,
  EXTERNAL_ROLES,

  // Vehicle
  VEHICLE_CATEGORY,
  FUEL_TYPE,

  // Address
  ADDRESS_TYPE,

  // Car Cleaner
  CLEANER_TYPE,
  CLEANER_CAPACITY,
  CLEANING_TYPE,

  // Subscription
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TYPE,

  // Booking
  BOOKING_STATUS,
  SERVICE_MODE,
  PAYMENT_MODE,
  PAYMENT_STATUS,

  // Franchise
  FRANCHISE_TYPE,
  FRANCHISE_STATUS,

  // NCSP
  NCSP_APP_STATUS,

  // Grievance
  GRIEVANCE_STATUS,
  GRIEVANCE_TYPE,

  // QR Code
  QR_STATUS,

  // Notifications
  NOTIFICATION_TYPE,

  // Search
  SEARCH_RANGE_KM,

  // Pagination
  PAGINATION,
};