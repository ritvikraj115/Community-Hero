// backend/controllers/communityVotingController.js

const Issue = require("../models/Issue");
const User = require("../models/User");
const Vote = require("../models/Vote");

const {
    calculateVotesRequired
} = require("../utils/voteCalculator");

const {
    rewardApprovalVote
} = require("../utils/gamification");

const {
    notifyResidents
} = require("../utils/notificationService");

const {
    logEvent
} = require("../utils/auditLogger");

/*
=========================================================
Community Voting Dashboard
Phase 3
=========================================================
*/

const getVotingQueue = async (req, res) => {

    try {

        const issues = await Issue.find({

            societyId: req.user.societyId,

            status: {

                $in: [

                    "Pending Approval",

                    "Pending Verification"

                ]

            }

        })
        .populate("creator", "name")
        .populate("solver", "name")
        .sort({
            createdAt: -1
        });

        const residents = await User.countDocuments({

            societyId: req.user.societyId,

            role: "resident",

            joinStatus: "approved"

        });

        const queue = issues.map(issue => ({

            _id: issue._id,

            category: issue.category,

            description: issue.description,

            status: issue.status,

            creator: issue.creator,

            solver: issue.solver,

            severityScore: issue.severityScore,

            votesReceived:
                issue.currentVotes.length,

            votesRequired:
                calculateVotesRequired(

                    residents,

                    issue.status ===
                    "Pending Approval"

                        ? issue.requiredApprovalVotes

                        : issue.requiredResolutionVotes

                ),

            createdAt: issue.createdAt

        }));

        res.json({

            success: true,

            queue

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
Vote Statistics
=========================================================
*/

const getVoteStatistics = async (req, res) => {

    try {

        const totalVotes =
            await Vote.countDocuments({

                societyId:
                    req.user.societyId

            });

        const approvalVotes =
            await Vote.countDocuments({

                societyId:
                    req.user.societyId,

                voteType:
                    "INITIAL_APPROVAL"

            });

        const resolutionVotes =
            await Vote.countDocuments({

                societyId:
                    req.user.societyId,

                voteType:
                    "RESOLUTION_APPROVAL"

            });

        res.json({

            success: true,

            statistics: {

                totalVotes,

                approvalVotes,

                resolutionVotes

            }

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

    getVotingQueue,

    getVoteStatistics

};