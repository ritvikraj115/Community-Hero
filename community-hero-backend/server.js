const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const apiRoutes = require("./routes/apiRoutes");
const {
  startKeepAlive,
  stopKeepAlive
} = require("./utils/keepAliveService");

const app = express();

const normalizeOrigin = (value) => value.replace(/\/+$/, "");

const parseCsvEnv = (value = "") => value
  .split(",")
  .map((item) => normalizeOrigin(item.trim()))
  .filter(Boolean);

const allowedOrigins = parseCsvEnv(
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  ""
);

const isProduction = process.env.NODE_ENV === "production";

const validateEnvironment = () => {
  const missing = ["MONGO_URI", "JWT_SECRET"].filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (isProduction && allowedOrigins.length === 0) {
    throw new Error("CORS_ORIGINS or FRONTEND_URL is required when NODE_ENV=production.");
  }
};

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }

    if (!isProduction && allowedOrigins.length === 0) {
      return callback(null, true);
    }

    const error = new Error("Origin is not allowed by CORS.");
    error.statusCode = 403;
    return callback(error);
  }
}));

app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "10mb"
}));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Community Hero API Running",
    timestamp: new Date().toISOString()
  });
});

app.use("/api", apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  validateEnvironment();

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB Connected Successfully");

  require("./utils/cronJobs");

  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startKeepAlive();
  });
};

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down Community Hero API...`);

  if (server) {
    stopKeepAlive();
    server.close(async () => {
      await mongoose.connection.close(false);
      process.exit(0);
    });
    return;
  }

  stopKeepAlive();
  await mongoose.connection.close(false);
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

if (require.main === module) {
  startServer().catch((err) => {
    console.error("MongoDB Connection Failed");
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer
};
