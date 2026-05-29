const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");
const cookieParser = require("cookie-parser");

const { errorHandler, notFoundHandler } = require("./src/middlewares/errorHandler");

const app = express();

app.use(helmet());
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

// ─── Routes ───────────────────────────────────────────────
app.use("/api/auth",     require("./src/routes/auth.routes"));
app.use("/api/profile",  require("./src/routes/profile.routes"));
app.use("/api/vehicles", require("./src/routes/vehicle.routes"));
app.use("/api/addresses",require("./src/routes/address.routes"));
app.use("/api/admin",    require("./src/routes/admin.routes"));

app.use("/api/cleaner/profile",    require("./src/routes/cleanerProfile.routes"));    // NEW
app.use("/api/ncsp/profile",       require("./src/routes/ncspProfile.routes"));       // NEW
app.use("/api/franchisee/profile", require("./src/routes/franchiseeProfile.routes")); // NEW

app.use(notFoundHandler);
app.use(errorHandler);





module.exports = app;