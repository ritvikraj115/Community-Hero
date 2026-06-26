// backend/routes/reportRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect,
    adminOnly
} = require("../middleware/auth");

const {
    getCommunityReport
} = require("../controllers/reportController");

/*
=========================================================
Community Reports
Phase 5

Admin Reports

Provides

• Community Summary
• Category Report
• Severity Report
• Issue Statistics
• Maintenance Statistics

Ready for

• CSV Export
• PDF Export
• Google Doc
• Admin Dashboard

=========================================================
*/

router.get(
    "/community",
    protect,
    adminOnly,
    getCommunityReport
);

module.exports = router;