// backend/routes/searchRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    globalSearch
} = require("../controllers/searchController");

/*
=====================================================
Community Global Search
=====================================================

Searches:
- Issues
- Residents
- Historical AI Insights
- Categories
- Reasons

GET /api/search?q=drainage

=====================================================
*/

router.get(
    "/",
    protect,
    globalSearch
);

module.exports = router;