// backend/utils/semanticSearchService.js

const Issue = require("../models/Issue");

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    const av = Number(a[index]);
    const bv = Number(b[index]);

    if (!Number.isFinite(av) || !Number.isFinite(bv)) return 0;

    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (!normA || !normB) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function isValidEmbedding(embedding) {
  return Array.isArray(embedding) && embedding.length > 0;
}

async function atlasVectorSearch({
  societyId,
  embedding,
  limit,
  candidateLimit,
  excludeIssueId = null,
  resolvedOnly = false
}) {
  const matchFilter = {
    societyId
  };

  if (resolvedOnly) {
    matchFilter.status = "Resolved";
  } else {
    matchFilter.status = {
      $in: [
        "Pending Approval",
        "Open",
        "In Progress",
        "Pending Verification"
      ]
    };
  }

  if (excludeIssueId) {
    matchFilter._id = {
      $ne: excludeIssueId
    };
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: process.env.MONGO_ISSUE_VECTOR_INDEX || "issue_embedding_index",
        path: "embedding",
        queryVector: embedding,
        numCandidates: candidateLimit,
        limit,
        filter: matchFilter
      }
    },
    {
      $addFields: {
        semanticSimilarity: {
          $meta: "vectorSearchScore"
        }
      }
    }
  ];

  return Issue.aggregate(pipeline);
}

async function boundedFallbackSearch({
  societyId,
  embedding,
  limit,
  candidateLimit,
  category,
  excludeIssueId = null,
  resolvedOnly = false
}) {
  const query = {
    societyId,
    embeddingDimensions: embedding.length,
    embedding: {
      $exists: true,
      $ne: []
    }
  };

  if (category) {
    query.category = category;
  }

  if (resolvedOnly) {
    query.status = "Resolved";
  } else {
    query.status = {
      $in: [
        "Pending Approval",
        "Open",
        "In Progress",
        "Pending Verification"
      ]
    };
  }

  if (excludeIssueId) {
    query._id = {
      $ne: excludeIssueId
    };
  }

  const candidates = await Issue.find(query)
    .populate("creator", "name")
    .populate("solver", "name")
    .sort({
      updatedAt: -1
    })
    .limit(candidateLimit);

  return candidates
    .map((issue) => ({
      issue,
      semanticSimilarity: cosineSimilarity(embedding, issue.embedding)
    }))
    .sort((left, right) => right.semanticSimilarity - left.semanticSimilarity)
    .slice(0, limit);
}

async function findSemanticNeighbors({
  societyId,
  embedding,
  limit = 20,
  candidateLimit = 250,
  category,
  excludeIssueId = null,
  resolvedOnly = false
}) {
  if (!isValidEmbedding(embedding)) return [];

  if (process.env.ENABLE_ATLAS_VECTOR_SEARCH === "true") {
    try {
      const docs = await atlasVectorSearch({
        societyId,
        embedding,
        limit,
        candidateLimit,
        excludeIssueId,
        resolvedOnly
      });

      return docs.map((issue) => ({
        issue,
        semanticSimilarity: Number(issue.semanticSimilarity) || 0
      }));
    } catch (err) {
      console.error("Atlas vector search failed, using bounded fallback:", err.message);
    }
  }

  return boundedFallbackSearch({
    societyId,
    embedding,
    limit,
    candidateLimit,
    category,
    excludeIssueId,
    resolvedOnly
  });
}

module.exports = {
  cosineSimilarity,
  findSemanticNeighbors
};
