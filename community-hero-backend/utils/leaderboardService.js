// backend/utils/leaderboardService.js

const User = require("../models/User");
const Leaderboard = require("../models/Leaderboard");

async function rebuildMonthlyLeaderboard(societyId) {

    const today = new Date();

    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const residents = await User.find({
        societyId,
        role: "resident",
        joinStatus: "approved"
    }).select(
        "name gamificationPoints"
    );

    residents.sort(
        (a, b) =>
            b.gamificationPoints -
            a.gamificationPoints
    );

    let rank = 1;

    for (const resident of residents) {

        await Leaderboard.findOneAndUpdate(

            {
                societyId,
                user: resident._id,
                month,
                year
            },

            {
                societyId,

                user: resident._id,

                month,

                year,

                totalPoints:
                    resident.gamificationPoints,

                currentRank: rank

            },

            {
                upsert: true,
                new: true
            }

        );

        rank++;

    }

    return await Leaderboard.find({

        societyId,

        month,

        year

    })
        .populate(
            "user",
            "name"
        )
        .sort({
            currentRank: 1
        });

}

async function getLeaderboard(

    societyId,

    month,

    year

) {

    return await Leaderboard.find({

        societyId,

        month,

        year

    })
        .populate(
            "user",
            "name"
        )
        .sort({

            currentRank: 1

        });

}

async function getTopThree(

    societyId,

    month,

    year

) {

    return await Leaderboard.find({

        societyId,

        month,

        year

    })
        .populate(
            "user",
            "name"
        )
        .sort({

            currentRank: 1

        })
        .limit(3);

}

module.exports = {

    rebuildMonthlyLeaderboard,

    getLeaderboard,

    getTopThree

};