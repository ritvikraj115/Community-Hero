// backend/controllers/issueDiscoveryController.js

const Issue = require("../models/Issue");

/*
=========================================================
Issue Discovery Controller
(Hackathon Phase 2)

Provides

• Nearby Issues
• Recent Issues
• Trending Categories
• Prevent duplicate reporting

=========================================================
*/

const getNearbyIssues = async (req, res) => {

    try {

        const {

            latitude,

            longitude,

            radius = 100

        } = req.query;

        if (
            latitude === undefined ||
            longitude === undefined
        ) {

            return res.status(400).json({

                success: false,

                error: "Location is required."

            });

        }

        const issues = await Issue.find({

            societyId: req.user.societyId,

            location: {

                $near: {

                    $geometry: {

                        type: "Point",

                        coordinates: [

                            Number(longitude),

                            Number(latitude)

                        ]

                    },

                    $maxDistance: Number(radius)

                }

            }

        })
        .populate(
            "creator",
            "name"
        )
        .sort({

            createdAt: -1

        });

        res.json({

            success: true,

            count: issues.length,

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

const getTrendingCategories = async (req, res) => {

    try {

        const categories = await Issue.aggregate([

            {

                $match: {

                    societyId: req.user.societyId

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

            },

            {

                $limit: 10

            }

        ]);

        res.json({

            success: true,

            categories

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

const getRecentIssues = async (req, res) => {

    try {

        const issues = await Issue.find({

            societyId: req.user.societyId

        })
        .populate(
            "creator",
            "name"
        )
        .sort({

            createdAt: -1

        })
        .limit(20);

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

    getNearbyIssues,

    getTrendingCategories,

    getRecentIssues

};