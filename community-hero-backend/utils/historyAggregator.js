// backend/utils/historyAggregator.js

const Issue = require("../models/Issue");

/*
===========================================================
PERSONAL DASHBOARD
===========================================================
*/

async function getUserHistory(userId) {
    const stats = await Issue.aggregate([
        {
            $match: {
                creator: userId
            }
        },
        {
            $group: {
                _id: "$creator",

                totalIssues: {
                    $sum: 1
                },

                resolvedIssues: {
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
                },

                pendingIssues: {
                    $sum: {
                        $cond: [
                            {
                                $ne: [
                                    "$status",
                                    "Resolved"
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },

                avgSeverity: {
                    $avg: "$severityScore"
                }
            }
        }
    ]);

    return stats.length ? stats[0] : {
        totalIssues: 0,
        resolvedIssues: 0,
        pendingIssues: 0,
        avgSeverity: 0
    };
}

/*
===========================================================
CATEGORY HISTORY
===========================================================
*/

async function getCategoryHistory(
    societyId,
    category
) {

    return await Issue.find({
        societyId,
        category,
        status: "Resolved"
    })
        .sort({
            createdAt: -1
        })
        .limit(10)
        .select(
            "category inferredReason createdAt solver deadline"
        );

}

/*
===========================================================
COMMUNITY INSIGHTS
===========================================================
*/

async function getCommunityInsights(
    societyId
) {

    return await Issue.aggregate([

        {
            $match: {
                societyId
            }
        },

        {
            $group: {

                _id: "$category",

                totalIssues: {
                    $sum: 1
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
                },

                avgSeverity: {
                    $avg: "$severityScore"
                }

            }
        },

        {
            $sort: {
                totalIssues: -1
            }
        }

    ]);

}

/*
===========================================================
TOP PROBLEM AREAS
===========================================================
*/

async function getHotspots(
    societyId
) {

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
                }

            }
        },

        {
            $sort: {
                count: -1
            }
        },

        {
            $limit: 5
        }

    ]);

}

/*
===========================================================
AVERAGE RESOLUTION TIME
===========================================================
*/

async function getAverageResolutionTime(
    societyId
) {

    return await Issue.aggregate([

        {
            $match: {
                societyId,
                status: "Resolved",
                deadline: {
                    $exists: true
                }
            }
        },

        {
            $project: {

                hoursTaken: {

                    $divide: [

                        {
                            $subtract: [
                                "$updatedAt",
                                "$createdAt"
                            ]
                        },

                        1000 * 60 * 60

                    ]

                }

            }
        },

        {

            $group: {

                _id: null,

                averageHours: {

                    $avg: "$hoursTaken"

                }

            }

        }

    ]);

}

module.exports = {

    getUserHistory,

    getCategoryHistory,

    getCommunityInsights,

    getHotspots,

    getAverageResolutionTime

};