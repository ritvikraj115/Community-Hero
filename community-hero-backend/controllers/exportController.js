// backend/controllers/exportController.js

const Issue = require("../models/Issue");
const User = require("../models/User");
const MaintenanceTask = require("../models/MaintenanceTask");
const Alert = require("../models/Alert");

/*
=========================================================
Export Dashboard Data
Phase 5

Frontend can directly export to

• PDF
• CSV
• Excel
• Google Docs

=========================================================
*/

const exportDashboard = async (req, res) => {

    try {

        const societyId = req.user.societyId;

        const [

            residents,

            issues,

            maintenance,

            alerts

        ] = await Promise.all([

            User.find({

                societyId,

                role: "resident",

                joinStatus: "approved"

            })
            .select("-password"),

            Issue.find({

                societyId

            })
            .populate(
                "creator",
                "name"
            )
            .populate(
                "solver",
                "name"
            ),

            MaintenanceTask.find({

                societyId

            }),

            Alert.find({

                societyId

            })

        ]);

        res.json({

            success: true,

            exportedAt: new Date(),

            community: {

                residents,

                issues,

                maintenance,

                alerts

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

module.exports = {

    exportDashboard

};