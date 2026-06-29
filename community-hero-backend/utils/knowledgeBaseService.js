// backend/utils/knowledgeBaseService.js

const Issue = require("../models/Issue");
require("../models/User");

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

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "near",
  "of",
  "on",
  "or",
  "the",
  "this",
  "to",
  "was",
  "were",
  "with"
]);

const TOKEN_ALIASES = {
  asphalt: "road",
  blocked: "clog",
  blockage: "clog",
  clogged: "clog",
  dripping: "leak",
  elevator: "lift",
  faucet: "tap",
  garbage: "waste",
  leakage: "leak",
  leaking: "leak",
  leaks: "leak",
  overflowed: "overflow",
  overflowing: "overflow",
  potholes: "pothole",
  repaired: "repair",
  seepage: "leak",
  trash: "waste",
  waterlogging: "waterlog"
};

function normalizeToken(token) {
  const clean = String(token || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!clean || STOP_WORDS.has(clean) || clean.length < 3) return "";

  if (TOKEN_ALIASES[clean]) return TOKEN_ALIASES[clean];

  if (clean.endsWith("ing") && clean.length > 5) return clean.slice(0, -3);
  if (clean.endsWith("ed") && clean.length > 4) return clean.slice(0, -2);
  if (clean.endsWith("s") && clean.length > 4) return clean.slice(0, -1);

  return clean;
}

function tokenize(text) {
  return new Set(
    String(text || "")
      .split(/\s+/)
      .map(normalizeToken)
      .filter(Boolean)
  );
}

function issueSearchText(issue) {
  return [
    issue.title,
    issue.description,
    issue.category,
    issue.inferredReason,
    issue.rootCause,
    issue.resolutionSummary,
    issue.resolutionExplanation,
    ...(Array.isArray(issue.tags) ? issue.tags : [])
  ]
    .filter(Boolean)
    .join(" ");
}

function buildQueryText({
  category = "",
  reason = "",
  inferredReason = "",
  description = "",
  rootCause = "",
  tags = [],
  queryText = ""
}) {
  return [
    queryText,
    category,
    reason || inferredReason,
    description,
    rootCause,
    ...(Array.isArray(tags) ? tags : [])
  ]
    .filter(Boolean)
    .join(" ");
}

function lexicalSimilarity(queryText, issue, category) {
  const queryTokens = tokenize(queryText);
  const issueTokens = tokenize(issueSearchText(issue));

  if (!queryTokens.size || !issueTokens.size) return 0;

  let overlap = 0;
  for (const token of queryTokens) {
    if (issueTokens.has(token)) overlap += 1;
  }

  const unionSize = new Set([...queryTokens, ...issueTokens]).size;
  const containment = overlap / Math.min(queryTokens.size, issueTokens.size);
  const jaccard = overlap / unionSize;
  const categoryBoost =
    category &&
    issue.category &&
    String(category).trim().toLowerCase() === String(issue.category).trim().toLowerCase()
      ? 0.12
      : 0;

  return Math.min(0.99, containment * 0.68 + jaccard * 0.32 + categoryBoost);
}

async function findLexicalHistory({
  societyId,
  queryText,
  category,
  limit
}) {
  const candidates = await Issue.find({
    societyId,
    status: "Resolved"
  })
    .populate("creator", "name")
    .populate("solver", "name")
    .sort({ updatedAt: -1 })
    .limit(Number(process.env.HISTORICAL_TEXT_CANDIDATE_LIMIT || 150));

  const minimum = Number(process.env.HISTORICAL_TEXT_MIN_SIMILARITY || 0.18);

  return candidates
    .map((issue) => ({
      issue,
      semanticSimilarity: lexicalSimilarity(queryText, issue, category),
      matchSource: "text"
    }))
    .filter((candidate) => candidate.semanticSimilarity >= minimum)
    .sort((left, right) => right.semanticSimilarity - left.semanticSimilarity)
    .slice(0, limit);
}

function mergeCandidates(candidates) {
  const byIssue = new Map();

  for (const candidate of candidates) {
    if (!candidate?.issue?._id) continue;

    const key = String(candidate.issue._id);
    const previous = byIssue.get(key);

    if (!previous || candidate.semanticSimilarity > previous.semanticSimilarity) {
      byIssue.set(key, candidate);
    }
  }

  return [...byIssue.values()];
}

async function getHistoricalRecommendations({
  societyId,
  embedding,
  category,
  reason = "",
  inferredReason = "",
  description = "",
  rootCause = "",
  tags = [],
  queryText = "",
  limit = 5
}) {
  const normalizedQueryText = buildQueryText({
    category,
    reason,
    inferredReason,
    description,
    rootCause,
    tags,
    queryText
  });

  const [semanticNeighbors, textNeighbors] = await Promise.all([
    findSemanticNeighbors({
      societyId,
      embedding,
      limit: 20,
      resolvedOnly: true
    }),
    findLexicalHistory({
      societyId,
      queryText: normalizedQueryText,
      category,
      limit: 20
    })
  ]);

  const semanticMinimum = Number(process.env.HISTORICAL_SEMANTIC_MIN_SIMILARITY || 0.72);
  const neighbors = mergeCandidates([
    ...semanticNeighbors
      .filter((candidate) => Number(candidate.semanticSimilarity) >= semanticMinimum)
      .map((candidate) => ({
        ...candidate,
        matchSource: "semantic"
      })),
    ...textNeighbors
  ]);

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
