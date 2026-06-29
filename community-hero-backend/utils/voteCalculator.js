// backend/utils/voteCalculator.js

/**
 * Calculates minimum votes required from a percentage.
 * Always rounds UP so minimum threshold is enforced.
 *
 * Example:
 * Residents = 17
 * Required = 20%
 *
 * 17 × .20 = 3.4
 *
 * Required votes = 4
 */

const calculateVotesRequired = (
    totalEligibleResidents,
    requiredPercentage
) => {

    if (totalEligibleResidents <= 0) {
        return 1;
    }

    return Math.max(
        1,
        Math.ceil(
            (totalEligibleResidents * requiredPercentage) / 100
        )
    );

};

/**
 * Returns voting progress
 */

const calculateVoteProgress = (
    currentVotes,
    requiredVotes
) => {

    const percentage = Math.min(
        100,
        Number(
            (
                (currentVotes / requiredVotes) *
                100
            ).toFixed(2)
        )
    );

    return {
        currentVotes,
        requiredVotes,
        percentage,
        completed: currentVotes >= requiredVotes
    };

};

/**
 * Approval Voting
 */

const getApprovalVoteStatus = ({
    totalResidents,
    currentVotes,
    requiredPercentage
}) => {

    const requiredVotes =
        calculateVotesRequired(
            totalResidents,
            requiredPercentage
        );

    return calculateVoteProgress(
        currentVotes,
        requiredVotes
    );

};

/**
 * Resolution Voting
 */

const getResolutionVoteStatus = ({
    totalResidents,
    currentVotes,
    requiredPercentage
}) => {

    const requiredVotes =
        calculateVotesRequired(
            totalResidents,
            requiredPercentage
        );

    return calculateVoteProgress(
        currentVotes,
        requiredVotes
    );

};

/**
 * AI decides voting threshold
 */

const getResolutionVotingThreshold = (
    aiConfidenceScore
) => {

    if (aiConfidenceScore >= 85) {

        return {
            requiredPercentage: 20,
            confidenceLevel: "HIGH"
        };

    }

    if (aiConfidenceScore >= 60) {

        return {
            requiredPercentage: 35,
            confidenceLevel: "MEDIUM"
        };

    }

    return {
        requiredPercentage: 50,
        confidenceLevel: "LOW"
    };

};

module.exports = {

    calculateVotesRequired,

    calculateVoteProgress,

    getApprovalVoteStatus,

    getResolutionVoteStatus,

    getResolutionVotingThreshold

};