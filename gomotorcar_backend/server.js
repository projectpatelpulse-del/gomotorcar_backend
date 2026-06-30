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

app.use(notFoundHandler);
app.use(errorHandler);





module.exports = app;
