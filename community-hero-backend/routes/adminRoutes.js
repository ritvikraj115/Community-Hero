// backend/routes/adminRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect,
    adminOnly
} = require("../middleware/auth");

const {

    getAdminOverview,

    getPendingApprovals,

    getAdminStats

} = require("../controllers/adminController");

/*
=========================================================
Admin Dashboard
=========================================================
*/

router.get(
    "/overview",
    protect,
    adminOnly,
    getAdminOverview
);

/*
=========================================================
Pending Resident Approvals
=========================================================
*/

router.get(
    "/pending-approvals",
    protect,
    adminOnly,
    getPendingApprovals
);

/*
=========================================================
Admin Statistics
=========================================================
*/

router.get(
    "/statistics",
    protect,
    adminOnly,
    getAdminStats
);

module.exports = router;