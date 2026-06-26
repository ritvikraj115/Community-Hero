// backend/controllers/searchController.js

const Issue = require("../models/Issue");
const User = require("../models/User");
const CommunityInsight = require("../models/CommunityInsights");

const globalSearch = async (req, res) => {

    try {

        const q = (req.query.q || "").trim();

        if (!q) {

            return res.status(400).json({

                success: false,

                error: "Search query is required."

            });

        }

        const societyId = req.user.societyId;

        const regex = new RegExp(q, "i");

        const [

            issues,

            residents,

            insights

        ] = await Promise.all([

            Issue.find({

                societyId,

                $or: [

                    { description: regex },

                    { category: regex },

                    { inferredReason: regex },

                    { status: regex }

                ]

            })
            .limit(15)
            .populate("creator", "name")
            .populate("solver", "name"),

            User.find({

                societyId,

                role: "resident",

                name: regex

            })
            .select("name gamificationPoints"),

            CommunityInsight.find({

                societyId,

                $or: [

                    { category: regex },

                    { inferredReason: regex },

                    { commonSolution: regex }

                ]

            })
            .limit(10)

        ]);

        res.json({

            success: true,

            results: {

                issues,

                residents,

                historicalInsights: insights

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

    globalSearch

};
