// backend/utils/insightAggregator.js

const Issue = require("../models/Issue");
const User = require("../models/User");

async function getPersonalInsights(userId, societyId) {

    const [
        created,
        solved,
        claimed,
        pending,
        votes,
        leaderboard
    ] = await Promise.all([

        Issue.countDocuments({
            creator: userId
        }),

        Issue.countDocuments({
            solver: userId,
            status: "Resolved"
        }),

        Issue.countDocuments({
            solver: userId
        }),

        Issue.countDocuments({
            creator: userId,
            status: {
                $ne: "Resolved"
            }
        }),

        Issue.aggregate([
            {
                $match: {
                    societyId
                }
            },
            {
                $project: {
                    totalVotes: {
                        $size: "$currentVotes"
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    votes: {
                        $sum: "$totalVotes"
                    }
                }
            }
        ]),

        User.find({
            societyId,
            role: "resident"
        })
            .sort({
                gamificationPoints: -1
            })
            .select("name gamificationPoints")
    ]);

    let rank = null;

    leaderboard.forEach((user, index) => {

        if (user._id.toString() === userId.toString()) {

            rank = index + 1;

        }

    });

    return {

        totalIssuesCreated: created,

        totalIssuesClaimed: claimed,

        totalIssuesResolved: solved,

        pendingIssues: pending,

        totalCommunityVotes:
            votes.length
                ? votes[0].votes
                : 0,

        leaderboardRank: rank,

        totalResidents:
            leaderboard.length

    };

}

async function getCategoryStatistics(societyId) {

    return await Issue.aggregate([

        {
            $match: {
                societyId
            }
        },

        {
            $group: {

                _id: "$category",

                count: {
                    $sum: 1
                },

                averageSeverity: {
                    $avg: "$severityScore"
                },

                resolved: {

                    $sum: {

                        $cond: [

                            {
                                $eq: [
                                    "$status",
                                    "Resolved"
                                ]
                            },

                            1,

                            0

                        ]

                    }

                }

            }

        },

        {
            $sort: {
                count: -1
            }
        }

    ]);

}

async function getRecurringReasons(societyId) {

    return await Issue.aggregate([

        {
            $match: {
                societyId
            }
        },

        {

            $group: {

                _id: "$inferredReason",

                occurrences: {
                    $sum: 1
                },

                category: {
                    $first: "$category"
                }

            }

        },

        {
            $sort: {
                occurrences: -1
            }
        },

        {
            $limit: 10
        }

    ]);

}

async function getSeverityDistribution(societyId) {

    return await Issue.aggregate([

        {
            $match: {
                societyId
            }
        },

        {

            $bucket: {

                groupBy: "$severityScore",

                boundaries: [
                    0,
                    3,
                    5,
                    7,
                    9,
                    11
                ],

                default: "Unknown",

                output: {

                    count: {
                        $sum: 1
                    }

                }

            }

        }

    ]);

}

module.exports = {

    getPersonalInsights,

    getCategoryStatistics,

    getRecurringReasons,

    getSeverityDistribution

};