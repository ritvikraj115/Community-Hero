// backend/routes/maintenanceRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect,
    adminOnly
} = require("../middleware/auth");

const {

    getMaintenanceTasks,

    createMaintenanceTask,

    completeMaintenanceTask,

    runMaintenanceScheduler

} = require("../controllers/maintenanceController");

/*
=====================================================
Maintenance Board
=====================================================
*/

// Community Maintenance Board
router.get(
    "/",
    protect,
    getMaintenanceTasks
);

// Admin creates maintenance task
router.post(
    "/",
    protect,
    adminOnly,
    createMaintenanceTask
);

// Mark maintenance completed
router.put(
    "/:taskId/complete",
    protect,
    adminOnly,
    completeMaintenanceTask
);

// Manual scheduler trigger (Admin)
router.post(
    "/run-scheduler",
    protect,
    adminOnly,
    runMaintenanceScheduler
);

module.exports = router;