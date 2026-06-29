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

const toIdString = (value) => {
    if (!value) return "";
    return String(value._id || value);
};

const isResolutionTeamMember = (issue, userId) => {
    const id = toIdString(userId);
    if (!id) return false;

    if (toIdString(issue.solver) === id) return true;

    return (issue.helpers || []).some(
        helper => toIdString(helper.user) === id
    );
};

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

        if (!["Open", "In Progress"].includes(issue.status)) {

            return res.status(400).json({

                success: false,

                error: "Issue cannot be joined."

            });

        }

        if (isResolutionTeamMember(issue, req.user.id)) {

            return res.status(400).json({

                success: false,

                error: "You are already on this resolution team."

            });

        }

        const joiningAsHelper = Boolean(issue.solver);

        if (joiningAsHelper) {

            issue.helpers.push({

                user: req.user.id,

                joinedAt: new Date(),

                requestedBy: issue.helpRequestedBy || null

            });

            issue.helpRequested = false;

        }
        else {

            issue.solver = req.user.id;

            issue.claimedAt = new Date();

        }

        issue.status = "In Progress";

        issue.estimatedCompletion =
            estimatedCompletion || issue.estimatedCompletion || null;

        issue.resourcesNeeded =
            resourcesNeeded || issue.resourcesNeeded || "";

        issue.timeline.push({

            action: "CLAIMED",

            status: issue.status,

            note: joiningAsHelper
                ? "Resident joined the resolution team."
                : "Resident took responsibility for the issue.",

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

            note: joiningAsHelper
                ? "Resident joined the resolution team."
                : "Resident took responsibility for the issue.",

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

            title: joiningAsHelper ? "Resident Joined Resolution Team" : "Issue Claimed",

            message:
                joiningAsHelper
                    ? `${req.user.name} joined the team resolving an issue.`
                    : `${req.user.name} has taken responsibility for resolving an issue.`,

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
