// backend/controllers/commentController.js

const Issue = require("../models/Issue");

const {
    notifyResidents
} = require("../utils/notificationService");

const {
    logEvent
} = require("../utils/auditLogger");

const getComments = async (req, res) => {

    try {

        const issue = await Issue.findOne({

            _id: req.params.issueId,

            societyId: req.user.societyId

        })
            .populate("comments.user", "name role");

        if (!issue) {

            return res.status(404).json({

                success: false,

                error: "Issue not found."

            });

        }

        res.json({

            success: true,

            comments: issue.comments

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

};

const addComment = async (req, res) => {

    try {

        const { text } = req.body;

        if (!text || !text.trim()) {

            return res.status(400).json({

                success: false,

                error: "Comment cannot be empty."

            });

        }

        const issue = await Issue.findOne({

            _id: req.params.issueId,

            societyId: req.user.societyId

        });

        if (!issue) {

            return res.status(404).json({

                success: false,

                error: "Issue not found."

            });

        }

        if (issue.status === "Pending Approval") {

            return res.status(400).json({

                success: false,

                error: "Comments are locked until the issue is open."

            });

        }

        issue.comments.push({

            user: req.user.id,

            text: text.trim()

        });

        await issue.save();

        await notifyResidents({

            societyId: issue.societyId,

            issue: issue._id,

            title: "New Comment",

            message: `${req.user.name} commented on an issue.`,

            type: "COMMENT",

            priority: "LOW",

            actionUrl: `/issues/${issue._id}`

        });

        await logEvent({

            actor: req.user.id,

            societyId: issue.societyId,

            issue: issue._id,

            action: "COMMENT_ADDED",

            resourceType: "COMMENT",

            resourceId: issue._id,

            description: "Comment added.",

            req

        });

        const updated = await Issue.findOne({

            _id: issue._id,

            societyId: req.user.societyId

        })
            .populate("comments.user", "name role");

        res.status(201).json({

            success: true,

            comments: updated.comments

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

};

const deleteComment = async (req, res) => {

    try {

        const issue = await Issue.findOne({

            _id: req.params.issueId,

            societyId: req.user.societyId

        });

        if (!issue) {

            return res.status(404).json({

                success: false,

                error: "Issue not found."

            });

        }

        const comment = issue.comments.id(req.params.commentId);

        if (!comment) {

            return res.status(404).json({

                success: false,

                error: "Comment not found."

            });

        }

        const isOwner =
            comment.user.toString() === req.user.id;

        const isAdmin =
            req.user.role === "admin";

        if (!isOwner && !isAdmin) {

            return res.status(403).json({

                success: false,

                error: "Unauthorized."

            });

        }

        comment.deleteOne();

        await issue.save();

        res.json({

            success: true,

            message: "Comment deleted."

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

};

module.exports = {

    getComments,

    addComment,

    deleteComment

};
