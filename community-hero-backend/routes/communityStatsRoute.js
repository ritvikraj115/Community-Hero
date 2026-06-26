// backend/routes/communityStatsRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    getCommunityStatistics
} = require("../controllers/communityStatsController");

/*
=========================================================
Community Statistics
(Hackathon Analytics)

Provides

• Overall Community Metrics
• Monthly Trends
• Category Breakdown
• Resolution Statistics
• Active Issues
• Maintenance Statistics

=========================================================
*/

router.get(
    "/",
    protect,
    getCommunityStatistics
);

module.exports = router;