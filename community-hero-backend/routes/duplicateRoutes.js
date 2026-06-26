// backend/routes/duplicateRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    checkDuplicateIssue
} = require("../controllers/duplicateController");

/*
=========================================================
Duplicate Detection
Phase 2 - Smart Deduplication
=========================================================
*/

router.post(
    "/check",
    protect,
    checkDuplicateIssue
);

module.exports = router;