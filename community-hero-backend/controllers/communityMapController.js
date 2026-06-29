// backend/controllers/communityMapController.js

const Issue = require("../models/Issue");
const MaintenanceTask = require("../models/MaintenanceTask");
const Society = require("../models/Society");

/*
=========================================================
Community Map
(Hackathon Demo Feature)

Shows

• Society Center
• Active Issues
• Pending Issues
• Maintenance
• Geofence Radius

=========================================================
*/

const getCommunityMap = async (req, res) => {

    try {

        const society = await Society.findById(
            req.user.societyId
        );

        if (!society) {

            return res.status(404).json({

                success: false,

                error: "Community not found."

            });

        }

        const issues = await Issue.find({

            societyId: society._id,

            status: {

                $ne: "Rejected"

            }

        })
        .populate(
            "creator",
            "name"
        )
        .populate(
            "solver",
            "name"
        )
        .select(

            "category status severityScore inferredReason location creator solver resolvedMediaUrl"

        );

        const maintenance = await MaintenanceTask.find({

            societyId: society._id,

            status: {

                $ne: "COMPLETED"

            }

        })
        .lean()
        .select(

            "title category priority deadline status location"

        );

        const maintenanceWithLocations = maintenance.map(task => ({

            ...task,

            location: task.location || society.location

        }));

        res.json({

            success: true,

            geofence: {

                center: {

                    latitude:
                        society.location.coordinates[1],

                    longitude:
                        society.location.coordinates[0]

                },

                radius:
                    society.radiusInMeters,

                mode:
                    society.geofenceMode,

                boundary:
                    society.boundary

            },

            issues,

            maintenance: maintenanceWithLocations

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

    getCommunityMap

};
