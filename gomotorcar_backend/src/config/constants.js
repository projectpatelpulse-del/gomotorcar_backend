// All app-wide constants in one place
// Never hardcode these anywhere else

const ROLES = {
  CUSTOMER:        "CU",
  CAR_CLEANER:     "CL",
  SUPERVISOR:      "SU",
  NCSP:            "NC",
  FRANCHISEE_CSP:  "FR",
  FRANCHISEE_STEAM:"FS",
  OPERATIONS_TEAM: "OT",
  IT_ADMIN:        "IT",
};

const USER_STATUS = {
  PENDING_APPROVAL: "pending_approval",
  APPROVED:         "approved",
  REJECTED:         "rejected",
  ACTIVE:           "active",
  INACTIVE:         "inactive",
};

const ENTITY_TYPE = {
  INDIVIDUAL: "individual",
  COMPANY:    "company",
};

// Roles that self-register via OTP
const SELF_REGISTER_ROLES = [
  ROLES.CUSTOMER,
  ROLES.CAR_CLEANER,
  ROLES.NCSP,
  ROLES.FRANCHISEE_CSP,
  ROLES.FRANCHISEE_STEAM,
];

// Roles created by Admin only (no self-registration)
const ADMIN_CREATED_ROLES = [
  ROLES.SUPERVISOR,
  ROLES.OPERATIONS_TEAM,
  ROLES.IT_ADMIN,
];

// Roles that need approval after registration
const REQUIRES_APPROVAL_ROLES = [
  ROLES.CAR_CLEANER,
  ROLES.NCSP,
  ROLES.FRANCHISEE_CSP,
  ROLES.FRANCHISEE_STEAM,
];

// Single session enforced (only one device at a time)
const SINGLE_SESSION_ROLES = [
  ROLES.CAR_CLEANER,
];

const OTP_PURPOSE = {
  REGISTRATION: "registration",
  LOGIN:        "login",
  RESET:        "reset",
};

module.exports = {
  ROLES,
  USER_STATUS,
  ENTITY_TYPE,
  SELF_REGISTER_ROLES,
  ADMIN_CREATED_ROLES,
  REQUIRES_APPROVAL_ROLES,
  SINGLE_SESSION_ROLES,
  OTP_PURPOSE,
};