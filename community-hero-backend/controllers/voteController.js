// backend/controllers/voteController.js

const Issue = require("../models/Issue");
const User = require("../models/User");

const Vote = require("../models/Vote");

const {
    calculateVotesRequired,
    getResolutionVotingThreshold
} = require("../utils/voteCalculator");

const {
    rewardApprovalVote,
    rewardResolutionVote
} = require("../utils/gamification");

const {
    sendIssueApprovedNotification
} = require("../utils/notificationService");

const {
    logEvent
} = require("../utils/auditLogger");
const {
    enrichResolvedIssueKnowledge
} = require("../utils/knowledgeBaseService");

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
==========================================================
INITIAL COMMUNITY APPROVAL
==========================================================
*/

const voteInitialApproval = async (req, res) => {

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

        if (!issue)
            return res.status(404).json({
                success: false,
                error: "Issue not found."
            });

        if (issue.status !== "Pending Approval")
            return res.status(400).json({
                success: false,
                error: "Issue is no longer awaiting approval."
            });

        if (toIdString(issue.creator) === req.user.id) {
            return res.status(403).json({
                success: false,
                error: "Issue creators cannot approve their own issue."
            });
        }

        const alreadyVoted = await Vote.findOne({

            issueId: issue._id,

            voter: req.user.id,

            societyId: issue.societyId,

            voteType: "INITIAL_APPROVAL"

        });

        const alreadyInIssueVotes = issue.approvalVoters.some(
            voter => toIdString(voter) === req.user.id
        );

        if (alreadyVoted || alreadyInIssueVotes)
            return res.status(400).json({
                success: false,
                error: "Already voted."
            });

        await Vote.create({

            issueId: issue._id,

            voter: req.user.id,

            societyId: issue.societyId,

            voteType: "INITIAL_APPROVAL"

        });

        issue.approvalVoters.push(req.user.id);

        issue.currentVotes = [
            ...issue.approvalVoters
        ];

        const residents =
            await User.countDocuments({

                societyId: issue.societyId,

                role: "resident",

                joinStatus: "approved"

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

            await sendIssueApprovedNotification(issue);

        }

        await issue.save();

        await rewardApprovalVote(req.user.id);

        await logEvent({

            actor: req.user.id,

            societyId: issue.societyId,

            issue: issue._id,

            action: "ISSUE_APPROVED",

            resourceType: "ISSUE",

            resourceId: issue._id,

            description: "Initial approval vote.",

            req

        });

        res.json({

            success: true,

            currentVotes:
                receivedVotes,

            requiredVotes,

            status: issue.status

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
==========================================================
RESOLUTION VOTING
==========================================================
*/

const voteResolution = async (req, res) => {

    try {

        if (req.user.role !== "resident") {

            return res.status(403).json({
                success: false,
                error: "Only residents can vote."
            });

        }

        const issue =
            await Issue.findOne({
                _id: req.params.issueId,
                societyId: req.user.societyId
            });

        if (!issue)
            return res.status(404).json({
                success: false,
                error: "Issue not found."
            });

        if (
            issue.status !==
            "Pending Verification"
        )
            return res.status(400).json({

                success: false,

                error:
                    "Issue is not awaiting verification."

            });

        if (
            isResolutionTeamMember(issue, req.user.id) ||
            toIdString(issue.resolutionSubmittedBy) === req.user.id
        ) {
            return res.status(403).json({
                success: false,
                error: "Resolvers cannot verify their own resolution."
            });
        }

        const alreadyVoted =
            await Vote.findOne({

                issueId: issue._id,

                voter: req.user.id,

                societyId: issue.societyId,

                voteType:
                    "RESOLUTION_APPROVAL"

            });

        const alreadyInIssueVotes = issue.resolutionVoters.some(
            voter => toIdString(voter) === req.user.id
        );

        if (alreadyVoted || alreadyInIssueVotes)
            return res.status(400).json({

                success: false,

                error: "Already voted."

            });

        await Vote.create({

            issueId: issue._id,

            voter: req.user.id,

            societyId: issue.societyId,

            voteType:
                "RESOLUTION_APPROVAL"

        });

        issue.resolutionVoters.push(req.user.id);

        issue.currentVotes = [
            ...issue.resolutionVoters
        ];

        const residents =
            await User.countDocuments({

                societyId:
                    issue.societyId,

                role: "resident",

                joinStatus:
                    "approved"

            });

        const threshold =
            getResolutionVotingThreshold(

                issue.aiConfidenceScore

            );

        const requiredVotes =
            calculateVotesRequired(

                residents,

                threshold.requiredPercentage

            );

        const receivedVotes =
            issue.resolutionVoters.length;

        if (
            receivedVotes >=
            requiredVotes
        ) {

            issue.status = "Resolved";

            issue.currentVotes = [];

            await enrichResolvedIssueKnowledge(issue);

        }

        await issue.save();

        await rewardResolutionVote(
            req.user.id
        );

        res.json({

            success: true,

            currentVotes:
                receivedVotes,

            requiredVotes,

            status: issue.status

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

    voteInitialApproval,

    voteResolution

};
