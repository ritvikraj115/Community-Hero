// backend/utils/communityHistoryService.js

const CommunityInsight = require("../models/CommunityInsights");
const {
    buildIssueEmbedding
} = require("./embeddingService");
const {
    getHistoricalRecommendations
} = require("./knowledgeBaseService");

/*
===========================================================
UPDATE COMMUNITY KNOWLEDGE BASE
Called whenever an issue is resolved
===========================================================
*/

async function updateCommunityHistory(issue) {

    let insight = await CommunityInsight.findOne({
        societyId: issue.societyId,
        category: issue.category,
        inferredReason: issue.inferredReason
    });

    const resolutionHours =
        (issue.updatedAt - issue.createdAt) /
        (1000 * 60 * 60);

    if (!insight) {

        insight = new CommunityInsight({

            societyId: issue.societyId,

            category: issue.category,

            inferredReason: issue.inferredReason,

            totalOccurrences: 1,

            resolvedOccurrences:
                issue.status === "Resolved" ? 1 : 0,

            averageSeverity:
                issue.severityScore || 0,

            aiConfidenceAverage:
                issue.aiConfidenceScore || 0,

            averageResolutionHours:
                issue.status === "Resolved"
                    ? resolutionHours
                    : 0,

            commonSolution:
                issue.resolutionSummary || "",

            lastOccurrence:
                issue.createdAt,

            lastResolved:
                issue.status === "Resolved"
                    ? new Date()
                    : null

        });

    }
    else {

        const previous =
            insight.totalOccurrences;

        insight.totalOccurrences += 1;

        if (issue.status === "Resolved") {

            insight.resolvedOccurrences += 1;

            insight.lastResolved = new Date();

            insight.averageResolutionHours =
                (
                    insight.averageResolutionHours *
                    (insight.resolvedOccurrences - 1) +
                    resolutionHours
                ) /
                insight.resolvedOccurrences;

        }

        insight.averageSeverity =
            (
                insight.averageSeverity *
                previous +
                (issue.severityScore || 0)
            ) /
            insight.totalOccurrences;

        insight.aiConfidenceAverage =
            (
                insight.aiConfidenceAverage *
                previous +
                (issue.aiConfidenceScore || 0)
            ) /
            insight.totalOccurrences;

        insight.lastOccurrence = new Date();

        if (
            issue.resolutionSummary &&
            issue.resolutionSummary.length >
            insight.commonSolution.length
        ) {

            insight.commonSolution =
                issue.resolutionSummary;

        }

    }

    await insight.save();

    return insight;

}

/*
===========================================================
Historical Similar Issues
===========================================================
*/

async function getHistoricalSolutions(
    societyId,
    category,
    inferredReason
) {

    const embeddingData = await buildIssueEmbedding({
        category,
        inferredReason,
        reason: inferredReason,
        description: inferredReason,
        rootCause: inferredReason,
        tags: [
            category,
            inferredReason
        ]
    });

    const semanticHistory =
        await getHistoricalRecommendations({
            societyId,
            embedding: embeddingData.embedding,
            category,
            inferredReason,
            description: inferredReason,
            rootCause: inferredReason,
            tags: [
                category,
                inferredReason
            ],
            queryText: embeddingData.semanticSummary,
            limit: 5
        });

    if (semanticHistory.length) {

        return semanticHistory;

    }

    return await CommunityInsight.find({

        societyId,

        category,

        inferredReason

    })
    .sort({
        updatedAt: -1
    });

}

/*
===========================================================
Top Recurring Problems
===========================================================
*/

async function getRecurringProblems(
    societyId,
    limit = 10
) {

    return await CommunityInsight.find({

        societyId

    })
    .sort({

        totalOccurrences: -1

    })
    .limit(limit);

}

module.exports = {

    updateCommunityHistory,

    getHistoricalSolutions,

    getRecurringProblems

};
