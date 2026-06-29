// backend/controllers/homeController.js

const Issue = require("../models/Issue");
const Alert = require("../models/Alert");
const User = require("../models/User");
const MaintenanceTask = require("../models/MaintenanceTask");

const getHomeData = async (req, res) => {

    try {

        const societyId = req.user.societyId;

        const [

            activeIssues,

            pendingApproval,

            inProgress,

            resolved,

            residents,

            leaderboard,

            alerts,

            maintenance

        ] = await Promise.all([

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

                status: "Resolved"

            }),

            User.countDocuments({

                societyId,

                role: "resident",

                joinStatus: "approved"

            }),

            User.find({

                societyId,

                role: "resident",

                joinStatus: "approved"

            })
            .select(
                "name gamificationPoints"
            )
            .sort({

                gamificationPoints: -1

            })
            .limit(5),

            Alert.find({

                societyId,

                status: "ACTIVE"

            })
            .sort({

                createdAt: -1

            })
            .limit(5),

            MaintenanceTask.find({

                societyId,

                status: {

                    $ne: "COMPLETED"

                }

            })
            .sort({

                deadline: 1

            })
            .limit(5)

        ]);

        const recentIssues =
            await Issue.find({

                societyId

            })
            .populate(
                "creator",
                "name"
            )
            .sort({

                createdAt: -1

            })
            .limit(8);

        res.json({

            success: true,

            heroCards: {

                residents,

                activeIssues,

                pendingApproval,

                inProgress,

                resolved

            },

            leaderboard,

            alerts,

            maintenance,

            recentIssues

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

    getHomeData

};