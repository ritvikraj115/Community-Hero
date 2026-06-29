// backend/utils/reputationService.js

const User = require("../models/User");
const Issue = require("../models/Issue");

async function calculateReputation(userId) {

    const user = await User.findById(userId);

    if (!user) throw new Error("User not found.");

    const [
        created,
        resolved,
        claimed,
        pending,
        rejected,
        duplicates
    ] = await Promise.all([

        Issue.countDocuments({
            creator: userId
        }),

        Issue.countDocuments({
            solver: userId,
            status: "Resolved"
        }),

        Issue.countDocuments({
            solver: userId
        }),

        Issue.countDocuments({
            creator: userId,
            status: {
                $in: [
                    "Pending Approval",
                    "Open",
                    "In Progress",
                    "Pending Verification"
                ]
            }
        }),

        Issue.countDocuments({
            creator: userId,
            status: "Rejected"
        }),

        Issue.countDocuments({
            creator: userId,
            duplicateMerged: true
        })

    ]);

    let score = 50;

    score += resolved * 6;

    score += claimed * 2;

    score += created * 2;

    score -= rejected * 5;

    score -= duplicates * 2;

    if (pending > 10)
        score -= 3;

    score += Math.floor(
        user.gamificationPoints / 50
    );

    score = Math.max(
        0,
        Math.min(100, score)
    );

    let badge = "Bronze";

    if (score >= 90)
        badge = "Platinum";

    else if (score >= 80)
        badge = "Gold";

    else if (score >= 65)
        badge = "Silver";

    return {

        score,

        badge,

        stats: {

            created,

            claimed,

            resolved,

            pending,

            rejected,

            duplicates,

            points:
                user.gamificationPoints

        }

    };

}

module.exports = {

    calculateReputation

};