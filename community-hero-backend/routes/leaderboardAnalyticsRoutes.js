// backend/routes/leaderboardAnalyticsRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {

    getLeaderboardAnalytics,

    getTopContributors

} = require("../controllers/leaderboardAnalyticsController");

/*
=========================================================
Leaderboard Analytics
Phase 4

Provides

• Monthly Leaderboard
• Hall Of Fame
• Contribution Distribution
• Monthly Rankings

=========================================================
*/

router.get(
    "/",
    protect,
    getLeaderboardAnalytics
);

/*
=========================================================
Top Contributors
=========================================================
*/

router.get(
    "/top-contributors",
    protect,
    getTopContributors
);

module.exports = router;