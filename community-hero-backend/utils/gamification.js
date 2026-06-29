// backend/utils/gamification.js

const User = require("../models/User");
const Leaderboard = require("../models/Leaderboard");

/*
=========================================
POINT CONFIGURATION
=========================================
*/

const POINTS = Object.freeze({
    ISSUE_CREATED: 15,
    ISSUE_CLAIMED: 10,
    ISSUE_RESOLVED: 50,
    APPROVAL_VOTE: 4,
    RESOLUTION_VOTE: 4
});

/*
=========================================
INCREMENT POINTS
=========================================
*/

function getCurrentMonth() {

    const today = new Date();

    return {
        month: today.getMonth() + 1,
        year: today.getFullYear()
    };

}

async function updateLeaderboard(user, points, bucket = {}) {

    if (!user || !user.societyId) return;

    const {
        month,
        year
    } = getCurrentMonth();

    const inc = {
        totalPoints: points
    };

    if (bucket.pointsField) {
        inc[bucket.pointsField] =
            bucket.pointsField === "penaltyPoints"
                ? Math.abs(points)
                : points;
    }

    if (bucket.countField) {
        inc[bucket.countField] = 1;
    }

    await Leaderboard.findOneAndUpdate(
        {
            societyId: user.societyId,
            user: user._id,
            month,
            year
        },
        {
            $setOnInsert: {
                societyId: user.societyId,
                user: user._id,
                month,
                year
            },
            $inc: inc
        },
        {
            upsert: true,
            new: true
        }
    );

}

async function addPoints(userId, points, bucket = {}) {

    if (!userId || !points) return;

    const inc = {
        gamificationPoints: points
    };

    if (bucket.userCountField) {
        inc[bucket.userCountField] = 1;
    }

    const user = await User.findByIdAndUpdate(
        userId,
        {
            $inc: inc
        },
        {
            new: true
        }
    );

    await updateLeaderboard(user, points, bucket);

    return user;

}

/*
=========================================
DEDUCT POINTS
=========================================
*/

async function deductPoints(userId, points) {

    if (!userId || !points) return;

    const user = await User.findByIdAndUpdate(
        userId,
        {
            $inc: {
                gamificationPoints: -Math.abs(points)
            }
        },
        {
            new: true
        }
    );

    await updateLeaderboard(user, -Math.abs(points), {
        pointsField: "penaltyPoints"
    });

}

/*
=========================================
ISSUE CREATED
=========================================
*/

async function rewardIssueCreation(userId) {

    await addPoints(
        userId,
        POINTS.ISSUE_CREATED,
        {
            pointsField: "issueCreatedPoints",
            countField: "issuesCreated",
            userCountField: "issuesReported"
        }
    );

}

/*
=========================================
CLAIM ISSUE
=========================================
*/

async function rewardIssueClaim(userId) {

    await addPoints(
        userId,
        POINTS.ISSUE_CLAIMED,
        {
            pointsField: "issueClaimPoints",
            countField: "issuesClaimed"
        }
    );

}

/*
=========================================
RESOLUTION
=========================================
*/

async function rewardIssueResolution(userId) {

    await addPoints(
        userId,
        POINTS.ISSUE_RESOLVED,
        {
            pointsField: "issueResolutionPoints",
            countField: "issuesResolved",
            userCountField: "issuesResolved"
        }
    );

}

/*
=========================================
APPROVAL VOTE
=========================================
*/

async function rewardApprovalVote(userId) {

    await addPoints(
        userId,
        POINTS.APPROVAL_VOTE,
        {
            pointsField: "votingPoints",
            countField: "votesCast"
        }
    );

}

/*
=========================================
RESOLUTION VOTE
=========================================
*/

async function rewardResolutionVote(userId) {

    await addPoints(
        userId,
        POINTS.RESOLUTION_VOTE,
        {
            pointsField: "votingPoints",
            countField: "votesCast",
            userCountField: "issuesVerified"
        }
    );

}

/*
=========================================
MISSED DEADLINE
=========================================
*/

async function penalizeDeadlineMiss(userId) {

    await deductPoints(
        userId,
        20
    );

}

/*
=========================================
FALSE REPORT
=========================================
*/

async function penalizeFalseReport(userId) {

    await deductPoints(
        userId,
        10
    );

}

/*
=========================================
RETURN LEADERBOARD
=========================================
*/

async function getLeaderboard(limit = 20) {

    return await User.find({
        role: "resident"
    })
        .select(
            "name gamificationPoints"
        )
        .sort({
            gamificationPoints: -1
        })
        .limit(limit);

}

module.exports = {

    POINTS,

    rewardIssueCreation,

    rewardIssueClaim,

    rewardIssueResolution,

    rewardApprovalVote,

    rewardResolutionVote,

    penalizeDeadlineMiss,

    penalizeFalseReport,

    getLeaderboard

};
