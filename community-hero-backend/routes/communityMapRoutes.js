// backend/routes/communityMapRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    getCommunityMap
} = require("../controllers/communityMapController");

/*
=========================================================
Community GIS Map
(Phase 1 + Phase 2)

Returns

• Society Geofence
• Active Issues
• Pending Approval Issues
• In Progress Issues
• Maintenance Tasks

Frontend:
Leaflet / Google Maps

=========================================================
*/

router.get(
    "/",
    protect,
    getCommunityMap
);

module.exports = router;