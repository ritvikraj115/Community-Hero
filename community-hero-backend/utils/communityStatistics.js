// backend/utils/communityStatistics.js

const Issue = require("../models/Issue");
const User = require("../models/User");

async function getCommunityStatistics(societyId) {

    const [
        totalResidents,
        totalIssues,
        resolvedIssues,
        pendingIssues,
        activeIssues,
        avgSeverity,
        avgResolution,
        categories
    ] = await Promise.all([

        User.countDocuments({
            societyId,
            role: "resident",
            joinStatus: "approved"
        }),

        Issue.countDocuments({
            societyId
        }),

        Issue.countDocuments({
            societyId,
            status: "Resolved"
        }),

        Issue.countDocuments({
            societyId,
            status: "Pending Approval"
        }),

        Issue.countDocuments({
            societyId,
            status: {
                $in: [
                    "Open",
                    "In Progress",
                    "Pending Verification"
                ]
            }
        }),

        Issue.aggregate([
            {
                $match: {
                    societyId
                }
            },
            {
                $group: {
                    _id: null,
                    avg: {
                        $avg: "$severityScore"
                    }
                }
            }
        ]),

        Issue.aggregate([
            {
                $match: {
                    societyId,
                    status: "Resolved"
                }
            },
            {
                $project: {

                    hours: {

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
                    avgHours: {
                        $avg: "$hours"
                    }
                }
            }
        ]),

        Issue.aggregate([

            {
                $match: {
                    societyId
                }
            },

            {
                $group: {

                    _id: "$category",

                    total: {
                        $sum: 1
                    }

                }

            },

            {
                $sort: {
                    total: -1
                }
            }

        ])

    ]);

    return {

        totalResidents,

        totalIssues,

        resolvedIssues,

        pendingIssues,

        activeIssues,

        averageSeverity:
            avgSeverity.length
                ? Number(avgSeverity[0].avg.toFixed(2))
                : 0,

        averageResolutionHours:
            avgResolution.length
                ? Number(avgResolution[0].avgHours.toFixed(2))
                : 0,

        topCategories: categories

    };

}

module.exports = {

    getCommunityStatistics

};