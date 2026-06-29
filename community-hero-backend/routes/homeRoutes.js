// backend/routes/homeRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    getHomeData
} = require("../controllers/homeController");

/*
=========================================================
Home Dashboard
=========================================================

Returns:

- Hero Cards
- Active Issues
- Leaderboard Preview
- Recent Issues
- Active Alerts
- Upcoming Maintenance

Used immediately after login.

=========================================================
*/

router.get(
    "/",
    protect,
    getHomeData
);

module.exports = router;