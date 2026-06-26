// backend/routes/claimRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {
    claimIssue
} = require("../controllers/claimController");

/*
=========================================================
Take Responsibility
(Phase 3)

Resident Workflow

Open Issue
    ↓
Take Responsibility
    ↓
Issue -> In Progress
    ↓
Unlock Comment Thread
    ↓
Notify Community
=========================================================
*/

router.post(
    "/:issueId",
    protect,
    claimIssue
);

module.exports = router;