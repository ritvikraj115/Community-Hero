// backend/routes/analyticsRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect,
    adminOnly
} = require("../middleware/auth");

const {

    getAnalyticsDashboard,

    getHealthScore,

    getRecurringIssueAnalytics

} = require("../controllers/analyticsController");

/*
=====================================================
Analytics Dashboard
=====================================================
*/

// Full analytics dashboard
router.get(
    "/dashboard",
    protect,
    getAnalyticsDashboard
);

// Community Health Score
router.get(
    "/health-score",
    protect,
    getHealthScore
);

// Recurring AI Insights
router.get(
    "/recurring-issues",
    protect,
    getRecurringIssueAnalytics
);

module.exports = router;