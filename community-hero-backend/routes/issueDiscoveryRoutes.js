// backend/routes/issueDiscoveryRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {

    getNearbyIssues,

    getTrendingCategories,

    getRecentIssues

} = require("../controllers/issueDiscoveryController");

/*
=========================================================
Issue Discovery
(Phase 2)

Provides

• Nearby Issues
• Trending Categories
• Recent Community Issues

=========================================================
*/

// Nearby Issues
router.get(
    "/nearby",
    protect,
    getNearbyIssues
);

// Trending Categories
router.get(
    "/trending",
    protect,
    getTrendingCategories
);

// Recent Issues
router.get(
    "/recent",
    protect,
    getRecentIssues
);

module.exports = router;