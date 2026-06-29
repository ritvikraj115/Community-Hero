// backend/controllers/resolutionVerificationController.js

const Issue = require("../models/Issue");
const Vote = require("../models/Vote");
const User = require("../models/User");
const ResolutionVerification = require("../models/ResolutionVerification");

const {
    rewardResolutionVote,
    rewardIssueResolution
} = require("../utils/gamification");

const {
    calculateVotesRequired
} = require("../utils/voteCalculator");

const {
    updateCommunityHistory
} = require("../utils/communityHistoryService");

const {
    rebuildMonthlyLeaderboard
} = require("../utils/leaderboardService");
const {
    enrichResolvedIssueKnowledge
} = require("../utils/knowledgeBaseService");

const {
    sendResolutionNotification
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
Resolution Verification Queue
=========================================================
*/

const getPendingVerifications = async (req, res) => {

    try {

        const issues = await Issue.find({

            societyId: req.user.societyId,

            status: "Pending Verification"

        })
        .populate("creator", "name")
        .populate("solver", "name")
        .sort({
            updatedAt: -1
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
Community Resolution Vote
=========================================================
*/

const verifyResolution = async (req, res) => {

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

        if (issue.status !== "Pending Verification") {

            return res.status(400).json({

                success: false,

                error: "Issue is not awaiting verification."

            });

        }

        if (
            isResolutionTeamMember(issue, req.user.id) ||
            toIdString(issue.resolutionSubmittedBy) === req.user.id
        ) {

            return res.status(403).json({

                success: false,

                error: "Resolvers cannot verify their own resolution."

            });

        }

        const alreadyVoted = await Vote.findOne({

            issueId: issue._id,

            voter: req.user.id,

            societyId: issue.societyId,

            voteType: "RESOLUTION_APPROVAL"

        });

        const alreadyInIssueVotes = issue.resolutionVoters.some(
            voter => toIdString(voter) === req.user.id
        );

        if (alreadyVoted || alreadyInIssueVotes) {

            return res.status(400).json({

                success: false,

                error: "Already voted."

            });

        }

        await Vote.create({

            issueId: issue._id,

            voter: req.user.id,

            societyId: issue.societyId,

            voteType: "RESOLUTION_APPROVAL"

        });

        issue.resolutionVoters.push(req.user.id);

        issue.currentVotes = [
            ...issue.resolutionVoters
        ];

        const residents = await User.countDocuments({

            societyId: issue.societyId,

            role: "resident",

            joinStatus: "approved"

        });

        const requiredVotes = calculateVotesRequired(

            residents,

            issue.requiredResolutionVotes

        );

        await rewardResolutionVote(req.user.id);

        const receivedVotes =
            issue.resolutionVoters.length;

        if (receivedVotes >= requiredVotes) {

            issue.status = "Resolved";

            issue.currentVotes = [];

            await enrichResolvedIssueKnowledge(issue);

            await issue.save();

            const resolverIds = [
                toIdString(issue.solver),
                ...(issue.helpers || []).map(helper => toIdString(helper.user))
            ].filter(Boolean);

            for (const resolverId of [...new Set(resolverIds)]) {
                await rewardIssueResolution(resolverId);
            }

            await updateCommunityHistory(issue);

            await rebuildMonthlyLeaderboard(issue.societyId);

            await ResolutionVerification.findOneAndUpdate(

                {

                    issue: issue._id

                },

                {

                    status: "APPROVED",

                    verifiedAt: new Date(),

                    receivedVotes:
                        receivedVotes

                }

            );

            await sendResolutionNotification(issue);

            await logEvent({

                actor: req.user.id,

                societyId: issue.societyId,

                issue: issue._id,

                action: "RESOLUTION_APPROVED",

                resourceType: "ISSUE",

                resourceId: issue._id,

                description:
                    "Community approved resolution.",

                req

            });

        }
        else {

            await issue.save();

        }

        res.json({

            success: true,

            status: issue.status,

            votesReceived: receivedVotes,

            votesRequired: requiredVotes

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

    getPendingVerifications,

    verifyResolution

};
