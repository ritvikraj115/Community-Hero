// backend/utils/hybridDuplicateDetector.js

const {
  findSemanticNeighbors
} = require("./semanticSearchService");

const {
  compareIssueImages
} = require("./imageComparisonService");

const THRESHOLDS = {
  semantic: Number(process.env.DUPLICATE_SEMANTIC_THRESHOLD || 0.88),
  distanceMeters: Number(process.env.DUPLICATE_DISTANCE_METERS || 50),
  imageConfidence: Number(process.env.DUPLICATE_IMAGE_CONFIDENCE || 90)
};

function getIssueCoordinates(issue) {
  const [longitude, latitude] = issue.location?.coordinates || [];

  return {
    latitude,
    longitude
  };
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function findHybridDuplicate({
  societyId,
  category,
  latitude,
  longitude,
  embedding,
  currentMediaUrl
}) {
  const neighbors = await findSemanticNeighbors({
    societyId,
    embedding,
    category,
    limit: 20,
    resolvedOnly: false
  });

  for (const neighbor of neighbors) {
    const issue = neighbor.issue;
    const semanticSimilarity = Number(neighbor.semanticSimilarity) || 0;
    const coordinates = getIssueCoordinates(issue);

    const distance = getDistanceMeters(
      Number(latitude),
      Number(longitude),
      Number(coordinates.latitude),
      Number(coordinates.longitude)
    );

    const semanticPass = semanticSimilarity >= THRESHOLDS.semantic;
    const distancePass = distance <= THRESHOLDS.distanceMeters;
    const categoryPass = issue.category === category;

    if (!semanticPass || !distancePass || !categoryPass) {
      continue;
    }

    const imageComparison = await compareIssueImages({
      existingMediaUrl: issue.mediaUrl,
      currentMediaUrl
    });

    const imagePass =
      imageComparison.sameInfrastructureIssue &&
      imageComparison.confidence >= THRESHOLDS.imageConfidence;

    issue.semanticSimilarity = semanticSimilarity;
    issue.imageSimilarity = imageComparison.confidence;
    issue.lastComparedAt = new Date();
    await issue.save();

    if (imagePass) {
      return {
        duplicate: true,
        issue,
        semanticSimilarity,
        imageSimilarity: imageComparison.confidence,
        distance: Math.round(distance),
        imageReason: imageComparison.reason,
        thresholds: THRESHOLDS
      };
    }
  }

  return {
    duplicate: false,
    issue: null,
    semanticSimilarity: null,
    imageSimilarity: null,
    distance: null,
    imageReason: "",
    thresholds: THRESHOLDS
  };
}

module.exports = {
  THRESHOLDS,
  findHybridDuplicate,
  getDistanceMeters
};
