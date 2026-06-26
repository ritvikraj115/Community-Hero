// backend/routes/proactiveRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect,
    adminOnly
} = require("../middleware/auth");

const {

    runProactiveScan,

    getCommunityAlerts

} = require("../controllers/proactiveController");

/*
=========================================================
Proactive AI & Weather Intelligence
=========================================================
*/

// Active community alerts
router.get(
    "/alerts",
    protect,
    getCommunityAlerts
);

// Admin manual trigger
router.post(
    "/scan",
    protect,
    adminOnly,
    runProactiveScan
);

module.exports = router;