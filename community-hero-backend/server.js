const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const apiRoutes = require("./routes/apiRoutes");

const app = express();

app.use(cors());

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
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required to start Community Hero API.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB Connected Successfully");

  require("./utils/cronJobs");

  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down Community Hero API...`);

  if (server) {
    server.close(async () => {
      await mongoose.connection.close(false);
      process.exit(0);
    });
    return;
  }

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
