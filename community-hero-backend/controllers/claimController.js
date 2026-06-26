// backend/controllers/claimController.js

const Issue = require("../models/Issue");

const {
    rewardIssueClaim
} = require("../utils/gamification");

const {
    notifyResidents,
    notifyUser
} = require("../utils/notificationService");

const {
    logEvent
} = require("../utils/auditLogger");

/*
=========================================================
Take Responsibility
(Phase 3)

Resident claims an issue.

Flow

Open Issue
    ↓
Take Responsibility
    ↓
Status -> In Progress
    ↓
Comments Unlocked
    ↓
Community Notified
=========================================================
*/

const claimIssue = async (req, res) => {

    try {

        const {

            estimatedCompletion,

            resourcesNeeded

        } = req.body;

        if (req.user.role !== "resident") {

            return res.status(403).json({

                success: false,

                error: "Only residents can claim issues."

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

        if (issue.status !== "Open") {

            return res.status(400).json({

                success: false,

                error: "Issue cannot be claimed."

            });

        }

        if (issue.solver) {

            return res.status(400).json({

                success: false,

                error: "Issue already claimed."

            });

        }

        issue.solver = req.user.id;

        issue.status = "In Progress";

        issue.claimedAt = new Date();

        issue.estimatedCompletion =
            estimatedCompletion || null;

        issue.resourcesNeeded =
            resourcesNeeded || "";

        issue.timeline.push({

            action: "CLAIMED",

            status: issue.status,

            note: "Resident took responsibility for the issue.",

            performedBy: req.user.id,

            metadata: {

                estimatedCompletion:
                    issue.estimatedCompletion,

                resourcesNeeded:
                    issue.resourcesNeeded

            }

        });

        issue.history.push({

            action: "CLAIMED",

            status: issue.status,

            note: "Resident took responsibility for the issue.",

            performedBy: req.user.id,

            metadata: {

                estimatedCompletion:
                    issue.estimatedCompletion,

                resourcesNeeded:
                    issue.resourcesNeeded

            }

        });

        await issue.save();

        await rewardIssueClaim(req.user.id);

        await notifyResidents({

            societyId: issue.societyId,

            issue: issue._id,

            title: "Issue Claimed",

            message:
                `${req.user.name} has taken responsibility for resolving an issue.`,

            type: "ISSUE_CLAIMED",

            priority: "MEDIUM",

            actionUrl: `/issues/${issue._id}`

        });

        await notifyUser(

            issue.creator,

            "Issue Claimed",

            `${req.user.name} has started working on your reported issue.`,

            "ISSUE"

        );

        await logEvent({

            actor: req.user.id,

            societyId: issue.societyId,

            issue: issue._id,

            action: "ISSUE_CLAIMED",

            resourceType: "ISSUE",

            resourceId: issue._id,

            description: "Resident claimed issue.",

            req

        });

        res.json({

            success: true,

            message: "Issue claimed successfully.",

            issue

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

    claimIssue

};
