// backend/controllers/reportController.js

const Issue = require("../models/Issue");
const User = require("../models/User");
const MaintenanceTask = require("../models/MaintenanceTask");

/*
=========================================================
Community Reports
Phase 5

Export-ready statistics for Admin Dashboard

=========================================================
*/

const getCommunityReport = async (req, res) => {

    try {

        const societyId = req.user.societyId;

        const [

            totalResidents,

            totalIssues,

            pendingApproval,

            open,

            inProgress,

            pendingVerification,

            resolved,

            maintenance,

            categoryWise,

            severityWise

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

                status: "Pending Approval"

            }),

            Issue.countDocuments({

                societyId,

                status: "Open"

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

                societyId

            }),

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

            ]),

            Issue.aggregate([

                {

                    $match: {

                        societyId

                    }

                },

                {

                    $group: {

                        _id: "$severityScore",

                        total: {

                            $sum: 1

                        }

                    }

                },

                {

                    $sort: {

                        _id: 1

                    }

                }

            ])

        ]);

        res.json({

            success: true,

            generatedAt: new Date(),

            summary: {

                totalResidents,

                totalIssues,

                pendingApproval,

                open,

                inProgress,

                pendingVerification,

                resolved,

                maintenance

            },

            categoryWise,

            severityWise

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

    getCommunityReport

};