// backend/controllers/communityApprovalController.js

const Issue = require("../models/Issue");
const Vote = require("../models/Vote");
const User = require("../models/User");

const {
    calculateVotesRequired
} = require("../utils/voteCalculator");

const {
    rewardApprovalVote
} = require("../utils/gamification");

const {
    sendIssueApprovedNotification
} = require("../utils/notificationService");

const {
    logEvent
} = require("../utils/auditLogger");

/*
=========================================================
Community Approval Queue
=========================================================
*/

const getPendingApprovalQueue = async (req, res) => {

    try {

        const issues = await Issue.find({

            societyId: req.user.societyId,

            status: "Pending Approval"

        })
        .populate("creator", "name")
        .sort({
            createdAt: -1
        });

        res.json({

            success: true,

            issues

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

/*
=========================================================
Community Vote
20% Required
=========================================================
*/

const approveIssue = async (req, res) => {

    try {

        if (req.user.role !== "resident") {

            return res.status(403).json({

                success: false,

                error: "Only residents can vote."

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

        if (issue.status !== "Pending Approval") {

            return res.status(400).json({

                success: false,

                error:
                    "Issue is already processed."

            });

        }

        const voted = await Vote.findOne({

            issueId: issue._id,

            voter: req.user.id,

            societyId: issue.societyId,

            voteType:
                "INITIAL_APPROVAL"

        });

        if (voted) {

            return res.status(400).json({

                success: false,

                error:
                    "Already voted."

            });

        }

        await Vote.create({

            issueId: issue._id,

            voter: req.user.id,

            societyId: issue.societyId,

            voteType:
                "INITIAL_APPROVAL"

        });

        issue.approvalVoters.push(req.user.id);

        issue.currentVotes = [
            ...issue.approvalVoters
        ];

        const residents =
            await User.countDocuments({

                societyId:
                    issue.societyId,

                role: "resident",

                joinStatus:
                    "approved"

            });

        const requiredVotes =
            calculateVotesRequired(

                residents,

                issue.requiredApprovalVotes

            );

        const receivedVotes =
            issue.approvalVoters.length;

        if (
            receivedVotes >=
            requiredVotes
        ) {

            issue.status = "Open";

            issue.currentVotes = [];

            await sendIssueApprovedNotification(

                issue

            );

        }

        await issue.save();

        await rewardApprovalVote(

            req.user.id

        );

        await logEvent({

            actor: req.user.id,

            societyId: issue.societyId,

            issue: issue._id,

            action: "ISSUE_APPROVED",

            resourceType: "ISSUE",

            resourceId: issue._id,

            description:
                "Community approval vote.",

            req

        });

        res.json({

            success: true,

            status: issue.status,

            currentVotes:
                receivedVotes,

            requiredVotes

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

    getPendingApprovalQueue,

    approveIssue

};
