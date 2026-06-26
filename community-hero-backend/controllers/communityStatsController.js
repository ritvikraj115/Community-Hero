// backend/controllers/communityStatsController.js

const Issue = require("../models/Issue");
const User = require("../models/User");
const MaintenanceTask = require("../models/MaintenanceTask");
const Alert = require("../models/Alert");

/*
=========================================================
Community Statistics
(Hackathon Analytics)
=========================================================
*/

const getCommunityStatistics = async (req, res) => {

    try {

        const societyId = req.user.societyId;

        const [

            totalResidents,

            totalIssues,

            activeIssues,

            pendingApproval,

            inProgress,

            pendingVerification,

            resolvedIssues,

            maintenanceTasks,

            activeAlerts

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

                status: "Open"

            }),

            Issue.countDocuments({

                societyId,

                status: "Pending Approval"

            }),

            Issue.countDocuments({

                societyId,

                status: "In Progress"

            }),

            Issue.countDocuments({

                societyId,

                status: "Pending Verification"

            }),

            Issue.countDocuments({

                societyId,

                status: "Resolved"

            }),

            MaintenanceTask.countDocuments({

                societyId,

                status: {

                    $ne: "COMPLETED"

                }

            }),

            Alert.countDocuments({

                societyId,

                status: "ACTIVE"

            })

        ]);

        const categoryBreakdown = await Issue.aggregate([

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

                    },

                    averageSeverity: {

                        $avg: "$severityScore"

                    }

                }

            },

            {

                $sort: {

                    total: -1

                }

            }

        ]);

        const monthlyTrend = await Issue.aggregate([

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

                    "_id.year": 1,

                    "_id.month": 1

                }

            }

        ]);

        res.json({

            success: true,

            overview: {

                totalResidents,

                totalIssues,

                activeIssues,

                pendingApproval,

                inProgress,

                pendingVerification,

                resolvedIssues,

                maintenanceTasks,

                activeAlerts

            },

            categoryBreakdown,

            monthlyTrend

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

    getCommunityStatistics

};