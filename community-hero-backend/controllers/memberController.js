// backend/controllers/memberController.js

const User = require("../models/User");
const Issue = require("../models/Issue");

const getCommunityMembers = async (req, res) => {

    try {

        const members = await User.find({

            societyId: req.user.societyId,

            joinStatus: "approved"

        })
        .select("-password")
        .sort({
            gamificationPoints: -1
        });

        const enriched = await Promise.all(

            members.map(async member => {

                const [

                    created,

                    resolved,

                    claimed

                ] = await Promise.all([

                    Issue.countDocuments({

                        creator: member._id

                    }),

                    Issue.countDocuments({

                        solver: member._id,

                        status: "Resolved"

                    }),

                    Issue.countDocuments({

                        solver: member._id

                    })

                ]);

                return {

                    _id: member._id,

                    name: member.name,

                    email: member.email,

                    role: member.role,

                    gamificationPoints:
                        member.gamificationPoints,

                    createdIssues:
                        created,

                    claimedIssues:
                        claimed,

                    resolvedIssues:
                        resolved,

                    joinedAt:
                        member.createdAt

                };

            })

        );

        res.json({

            success: true,

            members: enriched

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

const getMemberProfile = async (req, res) => {

    try {

        const member = await User.findOne({

            _id: req.params.memberId,

            societyId: req.user.societyId

        }).select("-password");

        if (!member) {

            return res.status(404).json({

                success: false,

                error: "Member not found."

            });

        }

        const [

            created,

            resolved,

            claimed,

            recentActivity

        ] = await Promise.all([

            Issue.countDocuments({

                creator: member._id

            }),

            Issue.countDocuments({

                solver: member._id,

                status: "Resolved"

            }),

            Issue.countDocuments({

                solver: member._id

            }),

            Issue.find({

                $or: [

                    {

                        creator:
                            member._id

                    },

                    {

                        solver:
                            member._id

                    }

                ]

            })
            .sort({
                updatedAt: -1
            })
            .limit(10)

        ]);

        res.json({

            success: true,

            profile: member,

            statistics: {

                created,

                claimed,

                resolved,

                points:
                    member.gamificationPoints

            },

            recentActivity

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

    getCommunityMembers,

    getMemberProfile

};