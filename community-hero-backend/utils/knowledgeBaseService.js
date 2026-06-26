// backend/utils/knowledgeBaseService.js

const {
  findSemanticNeighbors
} = require("./semanticSearchService");

const {
  buildResolutionEmbedding
} = require("./embeddingService");

function resolutionHours(issue) {
  if (!issue.createdAt || !issue.updatedAt) return null;

  return Number(
    (
      (new Date(issue.updatedAt) - new Date(issue.createdAt)) /
      (1000 * 60 * 60)
    ).toFixed(2)
  );
}

function resolutionScore(issue) {
  const quality = Number(issue.resolutionQuality) || 0;
  const confidence = Number(issue.resolutionConfidence || issue.aiConfidenceScore) || 0;
  const hasAfterImage = issue.resolvedMediaUrl ? 10 : 0;

  return quality + confidence + hasAfterImage;
}

async function getHistoricalRecommendations({
  societyId,
  embedding,
  category,
  limit = 5
}) {
  const neighbors = await findSemanticNeighbors({
    societyId,
    embedding,
    category,
    limit: 20,
    resolvedOnly: true
  });

  return neighbors
    .sort((left, right) => {
      if (right.semanticSimilarity !== left.semanticSimilarity) {
        return right.semanticSimilarity - left.semanticSimilarity;
      }

      return resolutionScore(right.issue) - resolutionScore(left.issue);
    })
    .slice(0, limit)
    .map(({ issue, semanticSimilarity }) => ({
      issue: issue._id,
      title: issue.title,
      reason: issue.inferredReason,
      solution: issue.resolutionSummary || issue.resolutionExplanation || "",
      resolutionTimeHours: resolutionHours(issue),
      solver: issue.solver || null,
      confidence: issue.resolutionConfidence || issue.aiConfidenceScore || null,
      beforeImage: issue.mediaUrl,
      afterImage: issue.resolvedMediaUrl,
      similarity: Number(semanticSimilarity.toFixed(4))
    }));
}

async function enrichResolvedIssueKnowledge(issue) {
  const resolutionEmbedding = await buildResolutionEmbedding(issue);

  issue.resolutionEmbedding = resolutionEmbedding.resolutionEmbedding;
  issue.resolutionEmbeddingDimensions = resolutionEmbedding.resolutionEmbeddingDimensions;
  issue.resolutionEmbeddingModel = resolutionEmbedding.resolutionEmbeddingModel;
  issue.resolutionEmbeddingVersion = resolutionEmbedding.resolutionEmbeddingVersion;
  issue.resolutionEmbeddingCreatedAt = resolutionEmbedding.resolutionEmbeddingCreatedAt;
  issue.resolutionQuality = Math.max(
    Number(issue.resolutionQuality) || 0,
    issue.resolvedMediaUrl ? 80 : 50
  );
  issue.resolutionConfidence =
    Number(issue.resolutionConfidence || issue.aiConfidenceScore) || null;

  return issue;
}

module.exports = {
  getHistoricalRecommendations,
  enrichResolvedIssueKnowledge
};
