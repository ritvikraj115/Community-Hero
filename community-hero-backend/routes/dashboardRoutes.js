// backend/routes/dashboardRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect,
    adminOnly
} = require("../middleware/auth");

const {

    getDashboard,

    getCommunityOverview,

    getPersonalDashboard,

    getLeaderboardData,

    getAlerts,

    getMaintenance

} = require("../controllers/dashboardController");

/*
=========================================================
Dashboard
=========================================================
*/

// Main Dashboard (Auto Admin / Resident)
router.get(
    "/",
    protect,
    getDashboard
);

/*
=========================================================
Resident Dashboard
=========================================================
*/

router.get(
    "/personal",
    protect,
    getPersonalDashboard
);

/*
=========================================================
Community Overview
=========================================================
*/

router.get(
    "/community-overview",
    protect,
    getCommunityOverview
);

/*
=========================================================
Leaderboard Card
=========================================================
*/

router.get(
    "/leaderboard",
    protect,
    getLeaderboardData
);

/*
=========================================================
Weather / System Alerts
=========================================================
*/

router.get(
    "/alerts",
    protect,
    getAlerts
);

/*
=========================================================
Maintenance Board
=========================================================
*/

router.get(
    "/maintenance",
    protect,
    getMaintenance
);

module.exports = router;