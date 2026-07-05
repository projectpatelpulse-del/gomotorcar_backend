const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");
const cookieParser = require("cookie-parser");

const requestLogger = require("./src/middlewares/requestLogger.middleware");
const { errorHandler, notFoundHandler } = require("./src/middlewares/errorHandler");

const logger = require("./src/utils/logger");

const {
  helmetMiddleware,
  generalLimiter,
  otpLimiter,
  loginLimiter,
  paymentLimiter,
  mongoSanitizeMiddleware,
  hppMiddleware,
  compressionMiddleware,
} = require("./src/middlewares/security.middleware");

const app = express();


app.use(helmet());

// ─────────────────────────────────────────────────────────
// CORS — Restrict to known origins in production
// Allows everything in development for convenience
// ─────────────────────────────────────────────────────────
const corsOptions = process.env.NODE_ENV === "production"
  ? {
      origin: (origin, callback) => {
        const allowedOrigins = [
          "https://gomotorcar.com",
          "https://www.gomotorcar.com",
          "https://admin.gomotorcar.com",
        ];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }
  : {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    };

app.use(cors(corsOptions));
// respond to preflight requests — avoid registering a wildcard route
// (some router/path-to-regexp versions throw on '*' route patterns)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Security Middlewares (apply early) ──────────────────
app.use(helmetMiddleware);
app.use(compressionMiddleware);
app.use(mongoSanitizeMiddleware);
app.use(hppMiddleware);
app.use(requestLogger);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "GoMotorCar API is running 🚗",
    version: "1.0.0",
  });
  });


// ─── General rate limit on all API routes ────────────────
app.use("/api", generalLimiter);

// ─── Health check (before rate limiting ideally, but fine here) ──
app.use("/api/health", require("./src/routes/health.routes"));

// ─── Stricter rate limits on sensitive routes ────────────
app.use("/api/auth/otp", otpLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/internal/login", loginLimiter);
app.use("/api/payment", paymentLimiter);
app.use("/api/fasttag/recharge", paymentLimiter);


// / ─── ... your existing routes stay here ... ──────────────
// app.use("/api/auth", ...);
// app.use("/api/profile", ...);
// etc — DO NOT remove these, just add above this point

// NOTE: 404 and global error handler are registered AFTER all routes below

// ─── Routes ───────────────────────────────────────────────
app.use("/api/auth",     require("./src/routes/auth.routes"));
app.use("/api/profile",  require("./src/routes/profile.routes"));
app.use("/api/vehicles", require("./src/routes/vehicle.routes"));
app.use("/api/addresses",require("./src/routes/address.routes"));
app.use("/api/admin/panel", require("./src/routes/adminPanel.routes"));
app.use("/api/admin",    require("./src/routes/admin.routes"));

app.use("/api/cleaner/profile",    require("./src/routes/cleanerProfile.routes"));    
app.use("/api/ncsp/profile",       require("./src/routes/ncspProfile.routes"));       
app.use("/api/franchisee/profile", require("./src/routes/franchiseeProfile.routes")); 
app.use("/api/packages",           require("./src/routes/package.routes"));     
app.use("/api/subscriptions",      require("./src/routes/subscription.routes"));   
app.use("/api/categories",         require("./src/routes/category.routes"));   
app.use("/api/search",             require("./src/routes/search.routes"));     
app.use("/api/booking",            require("./src/routes/booking.routes"));
app.use("/api/fasttag",            require("./src/routes/fasttag.routes"));   
app.use("/api/payment",            require("./src/routes/payment.routes"));
app.use("/api/cleaner", require("./src/routes/cleaner.routes"));
app.use("/api/supervisor", require("./src/routes/supervisor.routes"));
app.use("/api/ncsp", require("./src/routes/ncsp.routes"));
app.use("/api/franchise", require("./src/routes/franchise.routes")); 
app.use("/api/ops", require("./src/routes/ops.routes")); 
app.use("/api/notifications", require("./src/routes/notification.routes")); 
app.use("/api/grievances",    require("./src/routes/grievance.routes"));     


// ─── 404 & error handlers — AFTER all routes ─────────────────
// ─── Swagger UI — auto-generated from registered routes
try {
  const mountSwagger = require("./src/docs/swagger");
  mountSwagger(app);
} catch (e) {
  logger.warn("Swagger docs not mounted: " + (e.message || e));
}
app.use(notFoundHandler);
app.use(errorHandler);





module.exports = app;
