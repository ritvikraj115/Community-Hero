// backend/routes/weatherAlertRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect,
    adminOnly
} = require("../middleware/auth");

const {

    triggerWeatherMonitoring,

    getActiveWeatherAlerts,

    dismissWeatherAlert

} = require("../controllers/weatherAlertController");

/*
=========================================================
AI Weather Intelligence
(Phase 4 - Proactive Intelligence)
=========================================================
*/

// Active weather alerts for community
router.get(
    "/",
    protect,
    getActiveWeatherAlerts
);

// Manual weather scan (Admin)
router.post(
    "/scan",
    protect,
    adminOnly,
    triggerWeatherMonitoring
);

// Archive/Dismiss alert (Admin)
router.put(
    "/:alertId/archive",
    protect,
    adminOnly,
    dismissWeatherAlert
);

module.exports = router;