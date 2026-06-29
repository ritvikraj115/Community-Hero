// backend/utils/societyInsights.js

const Issue = require("../models/Issue");

async function getSocietyInsights(societyId) {

    const [
        recurringIssues,
        rootCauses,
        vulnerableLocations,
        monthlyTrend,
        aiSummary
    ] = await Promise.all([

        Issue.aggregate([
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
        ]),

        Issue.aggregate([
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
        ]),

        Issue.aggregate([
            {
                $match: {
                    societyId
                }
            },
            {
                $group: {

                    _id: "$location.coordinates",

                    issues: {
                        $sum: 1
                    },

                    category: {
                        $first: "$category"
                    }

                }
            },
            {
                $sort: {
                    issues: -1
                }
            },
            {
                $limit: 10
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

                    _id: {

                        year: {
                            $year: "$createdAt"
                        },

                        month: {
                            $month: "$createdAt"
                        }

                    },

                    issues: {
                        $sum: 1
                    }

                }

            },

            {
                $sort: {

                    "_id.year": 1,

                    "_id.month": 1

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

                    _id: null,

                    avgSeverity: {
                        $avg: "$severityScore"
                    },

                    avgConfidence: {
                        $avg: "$aiConfidenceScore"
                    },

                    avgVotes: {
                        $avg: {
                            $size: "$currentVotes"
                        }
                    }

                }

            }

        ])

    ]);

    return {

        recurringIssues,

        rootCauses,

        vulnerableLocations,

        monthlyTrend,

        aiSummary:
            aiSummary.length
                ? aiSummary[0]
                : {}

    };

}

module.exports = {

    getSocietyInsights

};