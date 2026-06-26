// backend/routes/maintenanceBoardRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {

    getMaintenanceBoard,

    getUpcomingMaintenance,

    getOverdueMaintenance

} = require("../controllers/maintenanceBoardController");

/*
=========================================================
Transparent Community Maintenance Board
(Phase 1 Requirement)
=========================================================
*/

// Entire maintenance board
router.get(
    "/",
    protect,
    getMaintenanceBoard
);

// Upcoming scheduled maintenance
router.get(
    "/upcoming",
    protect,
    getUpcomingMaintenance
);

// Overdue maintenance
router.get(
    "/overdue",
    protect,
    getOverdueMaintenance
);

module.exports = router;