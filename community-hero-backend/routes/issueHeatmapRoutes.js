// backend/routes/issueHeatmapRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {

    getIssueHeatmap,

    getCategoryHeatmap

} = require("../controllers/issueHeatMapController");

/*
=========================================================
Community Issue Heatmap
Phase 4

Provides

• Complete Community Heatmap
• Severity Weighted Heatmap
• AI Hotspots

=========================================================
*/

router.get(
    "/",
    protect,
    getIssueHeatmap
);

/*
=========================================================
Category Heatmap

Example

GET
/api/issue-heatmap/category/Drainage

=========================================================
*/

router.get(
    "/category/:category",
    protect,
    getCategoryHeatmap
);

module.exports = router;
