// backend/routes/exportRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect,
    adminOnly
} = require("../middleware/auth");

const {
    exportDashboard
} = require("../controllers/exportController");

/*
=========================================================
Export APIs
Phase 5

Ready for

• CSV
• Excel
• PDF
• Google Docs
• Submission Reports

=========================================================
*/

// Complete dashboard export
router.get(
    "/dashboard",
    protect,
    adminOnly,
    exportDashboard
);

module.exports = router;