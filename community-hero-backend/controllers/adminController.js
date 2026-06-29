// backend/controllers/adminController.js

const User = require("../models/User");
const Society = require("../models/Society");
const Issue = require("../models/Issue");
const MaintenanceTask = require("../models/MaintenanceTask");
const Alert = require("../models/Alert");

const getAdminOverview = async (req, res) => {

    try {

        if (req.user.role !== "admin") {

            return res.status(403).json({

                success: false,

                error: "Admin access required."

            });

        }

        const societyId = req.user.societyId;

        const [

            society,

            residents,

            pendingResidents,

            issues,

            resolved,

            maintenance,

            alerts

        ] = await Promise.all([

            Society.findById(societyId),

            User.countDocuments({

                societyId,

                role: "resident",

                joinStatus: "approved"

            }),

            User.countDocuments({

                pendingSocietyId: societyId,

                joinStatus: "pending"

            }),

            Issue.countDocuments({

                societyId,

                status: {

                    $in: [

                        "Open",

                        "Pending Approval",

                        "In Progress",

                        "Pending Verification"

                    ]

                }

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

        res.json({

            success: true,

            overview: {

                society,

                residents,

                pendingResidents,

                activeIssues: issues,

                resolvedIssues: resolved,

                maintenanceTasks: maintenance,

                activeAlerts: alerts

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

const getPendingApprovals = async (req, res) => {

    try {

        const residents = await User.find({

            pendingSocietyId: req.user.societyId,

            joinStatus: "pending"

        }).select("-password");

        res.json({

            success: true,

            residents

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

const getAdminStats = async (req, res) => {

    try {

        const issues = await Issue.aggregate([

            {

                $match: {

                    societyId: req.user.societyId

                }

            },

            {

                $group: {

                    _id: "$status",

                    count: {

                        $sum: 1

                    }

                }

            }

        ]);

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

module.exports = {

    getAdminOverview,

    getPendingApprovals,

    getAdminStats

};