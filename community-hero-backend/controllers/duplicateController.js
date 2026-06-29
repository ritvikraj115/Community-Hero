// backend/controllers/duplicateController.js

const Issue = require("../models/Issue");

const {
  findDuplicateIssue
} = require("../utils/duplicateDetection");
const {
  buildIssueEmbedding
} = require("../utils/embeddingService");
const {
  findSemanticNeighbors
} = require("../utils/semanticSearchService");

const checkDuplicateIssue = async (req, res) => {
  try {
    const {
      category,
      latitude,
      longitude,
      description = "",
      rootCause = "",
      tags = [],
      title = "",
      currentMediaUrl
    } = req.body;

    if (!category || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: "Category and location are required."
      });
    }

    const embeddingData = await buildIssueEmbedding({
      category,
      inferredReason: description,
      reason: description,
      description,
      rootCause,
      tags
    });

    const duplicate = await findDuplicateIssue({
      societyId: req.user.societyId,
      category,
      title,
      description,
      reason: description,
      inferredReason: description,
      rootCause,
      tags,
      semanticSummary: embeddingData.semanticSummary,
      latitude,
      longitude,
      embedding: embeddingData.embedding,
      currentMediaUrl
    });

    if (duplicate.duplicate) {
      const issue = await Issue.findOne({
        _id: duplicate.issue._id,
        societyId: req.user.societyId
      })
        .populate("creator", "name")
        .populate("solver", "name");

      return res.json({
        success: true,
        duplicate: true,
        issue,
        semanticSimilarity: duplicate.semanticSimilarity,
        textSimilarity: duplicate.textSimilarity,
        categorySimilarity: duplicate.categorySimilarity,
        locationSimilarity: duplicate.locationSimilarity,
        locationNameSimilarity: duplicate.locationNameSimilarity,
        imageSimilarity: duplicate.imageSimilarity,
        distance: duplicate.distance
      });
    }

    const candidates = await findSemanticNeighbors({
      societyId: req.user.societyId,
      embedding: embeddingData.embedding,
      limit: 5
    });

    return res.json({
      success: true,
      duplicate: false,
      semanticCandidates: candidates.map(({ issue, semanticSimilarity }) => ({
        issue: issue._id,
        title: issue.title,
        status: issue.status,
        semanticSimilarity
      }))
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

module.exports = {
  checkDuplicateIssue
};
