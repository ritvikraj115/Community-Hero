// backend/routes/commentRoutes.js

const express = require("express");

const router = express.Router();

const {
    protect
} = require("../middleware/auth");

const {

    getComments,

    addComment,

    deleteComment

} = require("../controllers/commentController");

/*
=====================================================
Issue Comments
=====================================================
*/

// Get all comments of an issue
router.get(
    "/:issueId/comments",
    protect,
    getComments
);

// Add comment
router.post(
    "/:issueId/comments",
    protect,
    addComment
);

// Delete comment
router.delete(
    "/:issueId/comments/:commentId",
    protect,
    deleteComment
);

module.exports = router;