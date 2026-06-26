// backend/utils/issueLifecycle.js

const Issue = require("../models/Issue");
const User = require("../models/User");

const {
    rewardIssueCreation,
    rewardIssueClaim,
    rewardIssueResolution,
    rewardApprovalVote,
    rewardResolutionVote
} = require("./gamification");

const {
    calculateVotesRequired,
    getResolutionVotingThreshold
} = require("./voteCalculator");

/*
==================================================
Pending Approval -> Open
==================================================
*/

async function processInitialApproval(issue) {

    const residents = await User.countDocuments({
        societyId: issue.societyId,
        role: "resident",
        joinStatus: "approved"
    });

    const requiredVotes =
        calculateVotesRequired(
            residents,
            issue.requiredApprovalVotes
        );

    const receivedVotes =
        issue.currentVotes.length;

    if (receivedVotes >= requiredVotes) {

        issue.status = "Open";

        await issue.save();

        return true;

    }

    return false;

}

/*
==================================================
Resident Claims Issue
==================================================
*/

async function claimIssue(issue, userId) {

    if (issue.solver)
        throw new Error("Issue already claimed.");

    issue.solver = userId;

    issue.status = "In Progress";

    await issue.save();

    await rewardIssueClaim(userId);

    return issue;

}

/*
==================================================
Submit Resolution
==================================================
*/

async function submitResolution(
    issue,
    imageUrl,
    confidence
) {

    issue.resolvedMediaUrl = imageUrl;

    issue.aiConfidenceScore = confidence;

    const voting =
        getResolutionVotingThreshold(
            confidence
        );

    issue.requiredResolutionVotes =
        voting.requiredPercentage;

    issue.currentVotes = [];

    issue.status =
        "Pending Verification";

    await issue.save();

    return issue;

}

/*
==================================================
Resolution Voting
==================================================
*/

async function processResolutionVote(
    issue,
    userId
) {

    const exists =
        issue.currentVotes.find(
            vote =>
                vote.toString() ===
                userId.toString()
        );

    if (exists)
        throw new Error(
            "Already voted."
        );

    issue.currentVotes.push(userId);

    await rewardResolutionVote(userId);

    const residents =
        await User.countDocuments({

            societyId:
                issue.societyId,

            role: "resident",

            joinStatus:
                "approved"

        });

    const requiredVotes =
        calculateVotesRequired(

            residents,

            issue.requiredResolutionVotes

        );

    if (
        issue.currentVotes.length >=
        requiredVotes
    ) {

        issue.status = "Resolved";

        await rewardIssueResolution(
            issue.solver
        );

    }

    await issue.save();

    return issue;

}

/*
==================================================
Create Issue Reward
==================================================
*/

async function rewardCreation(
    creatorId
) {

    await rewardIssueCreation(
        creatorId
    );

}

/*
==================================================
Approval Vote Reward
==================================================
*/

async function rewardVote(
    voterId
) {

    await rewardApprovalVote(
        voterId
    );

}

module.exports = {

    processInitialApproval,

    claimIssue,

    submitResolution,

    processResolutionVote,

    rewardCreation,

    rewardVote

};