// backend/utils/embeddingService.js

const {
  generateEmbedding
} = require("./googleEmbeddingService");

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  return tags
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

function buildIssueSemanticSummary({
  category = "",
  reason = "",
  inferredReason = "",
  description = "",
  rootCause = "",
  tags = []
}) {
  const cleanTags = normalizeTags(tags);
  const issueReason = reason || inferredReason;

  return [
    `Category: ${category || "Unknown"}`,
    `Reason: ${issueReason || "Unknown"}`,
    `Description: ${description || ""}`,
    `Root cause: ${rootCause || "Unknown"}`,
    cleanTags.length ? `Tags: ${cleanTags.join(", ")}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

async function buildIssueEmbedding(issueLike) {
  const semanticSummary = buildIssueSemanticSummary(issueLike);
  const embeddingResult = await generateEmbedding(semanticSummary);

  return {
    semanticSummary,
    embedding: embeddingResult.embedding,
    embeddingDimensions: embeddingResult.dimensions,
    embeddingModel: embeddingResult.model,
    embeddingVersion: embeddingResult.version,
    embeddingCreatedAt: embeddingResult.createdAt
  };
}

async function buildResolutionEmbedding(issueLike) {
  const resolutionText = [
    `Category: ${issueLike.category || "Unknown"}`,
    `Issue reason: ${issueLike.inferredReason || ""}`,
    `Root cause: ${issueLike.rootCause || ""}`,
    `Resolution summary: ${issueLike.resolutionSummary || ""}`,
    `Resolution explanation: ${issueLike.resolutionExplanation || ""}`,
    `Tags: ${normalizeTags(issueLike.tags).join(", ")}`
  ]
    .filter(Boolean)
    .join("\n");

  const embeddingResult = await generateEmbedding(resolutionText);

  return {
    resolutionEmbedding: embeddingResult.embedding,
    resolutionEmbeddingDimensions: embeddingResult.dimensions,
    resolutionEmbeddingModel: embeddingResult.model,
    resolutionEmbeddingVersion: embeddingResult.version,
    resolutionEmbeddingCreatedAt: embeddingResult.createdAt
  };
}

module.exports = {
  normalizeTags,
  buildIssueSemanticSummary,
  buildIssueEmbedding,
  buildResolutionEmbedding
};
