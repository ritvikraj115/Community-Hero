// backend/controllers/communityController.js

const Society = require("../models/Society");
const User = require("../models/User");
const Issue = require("../models/Issue");
const MaintenanceTask = require("../models/MaintenanceTask");

const getCommunityProfile = async (req, res) => {

    try {

        const society = await Society.findById(req.user.societyId)
            .populate("admin", "name email");

        if (!society) {

            return res.status(404).json({

                success: false,

                error: "Community not found."

            });

        }

        const [

            totalResidents,

            activeIssues,

            resolvedIssues,

            maintenanceTasks

        ] = await Promise.all([

            User.countDocuments({

                societyId: society._id,

                role: "resident",

                joinStatus: "approved"

            }),

            Issue.countDocuments({

                societyId: society._id,

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

                societyId: society._id,

                status: "Resolved"

            }),

            MaintenanceTask.countDocuments({

                societyId: society._id

            })

        ]);

        res.json({

            success: true,

            community: {

                ...society.toObject(),

                statistics: {

                    totalResidents,

                    activeIssues,

                    resolvedIssues,

                    maintenanceTasks

                }

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

const updateCommunityProfile = async (req, res) => {

    try {

        const society = await Society.findById(req.user.societyId);

        if (!society) {

            return res.status(404).json({

                success: false,

                error: "Community not found."

            });

        }

        society.name =
            req.body.name || society.name;

        society.radiusInMeters =
            req.body.radiusInMeters || society.radiusInMeters;

        if (req.body.communityDetails) {

            society.communityDetails = {

                ...society.communityDetails,

                ...req.body.communityDetails

            };

        }

        await society.save();

        res.json({

            success: true,

            society

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

const getCommunitySummary = async (req, res) => {

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

            summary: issues

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

    getCommunityProfile,

    updateCommunityProfile,

    getCommunitySummary

};