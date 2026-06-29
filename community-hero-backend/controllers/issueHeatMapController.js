// backend/controllers/issueHeatmapController.js

const Issue = require("../models/Issue");

/*
=========================================================
Issue Heatmap
Phase 4

Used by

• Google Maps
• Leaflet
• Dashboard Heatmap
• AI Hotspot Detection

=========================================================
*/

const getIssueHeatmap = async (req, res) => {

    try {

        const societyId = req.user.societyId;

        const issues = await Issue.find({

            societyId,

            status: {

                $ne: "Resolved"

            }

        })
        .select(

            "category severityScore status location createdAt"

        );

        const heatmap = issues.map(issue => ({

            id: issue._id,

            latitude:
                issue.location.coordinates[1],

            longitude:
                issue.location.coordinates[0],

            weight:
                issue.severityScore || 1,

            category:
                issue.category,

            status:
                issue.status,

            createdAt:
                issue.createdAt

        }));

        res.json({

            success: true,

            totalPoints:
                heatmap.length,

            heatmap

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
Category Heatmap
=========================================================
*/

const getCategoryHeatmap = async (req, res) => {

    try {

        const category =
            req.params.category;

        const issues = await Issue.find({

            societyId:
                req.user.societyId,

            category,

            status: {

                $ne: "Resolved"

            }

        })
        .select(

            "severityScore location"

        );

        const heatmap = issues.map(issue => ({

            latitude:
                issue.location.coordinates[1],

            longitude:
                issue.location.coordinates[0],

            weight:
                issue.severityScore || 1

        }));

        res.json({

            success: true,

            category,

            heatmap

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

    getIssueHeatmap,

    getCategoryHeatmap

};