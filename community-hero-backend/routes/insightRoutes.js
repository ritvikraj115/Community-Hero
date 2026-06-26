// backend/routes/insightRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {

    getPersonalInsightDashboard,

    getCommunityInsightDashboard,

    getHistoricalReason

} = require("../controllers/insightController");

/*
=========================================================
Personal Insights
=========================================================
*/

router.get(
    "/personal",
    protect,
    getPersonalInsightDashboard
);

/*
=========================================================
Community Insights
=========================================================
*/

router.get(
    "/community",
    protect,
    getCommunityInsightDashboard
);

/*
=========================================================
Historical AI Knowledge Base

GET
/api/insights/history?category=Drainage&reason=Blocked%20Stormwater
=========================================================
*/

router.get(
    "/history",
    protect,
    getHistoricalReason
);

module.exports = router;