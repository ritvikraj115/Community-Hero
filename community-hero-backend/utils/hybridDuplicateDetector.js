// backend/utils/hybridDuplicateDetector.js

const {
  findSemanticNeighbors
} = require("./semanticSearchService");

const {
  compareIssueImages
} = require("./imageComparisonService");

const Issue = require("../models/Issue");
require("../models/User");

const ACTIVE_STATUSES = [
  "Pending Approval",
  "Open",
  "In Progress",
  "Pending Verification"
];

const THRESHOLDS = {
  semantic: Number(process.env.DUPLICATE_SEMANTIC_THRESHOLD || 0.82),
  strongSemantic: Number(process.env.DUPLICATE_STRONG_SEMANTIC_THRESHOLD || 0.92),
  text: Number(process.env.DUPLICATE_TEXT_THRESHOLD || 0.34),
  strongText: Number(process.env.DUPLICATE_STRONG_TEXT_THRESHOLD || 0.55),
  distanceMeters: Number(process.env.DUPLICATE_DISTANCE_METERS || 100),
  candidateDistanceMeters: Number(process.env.DUPLICATE_CANDIDATE_DISTANCE_METERS || 160),
  imageConfidence: Number(process.env.DUPLICATE_IMAGE_CONFIDENCE || 85)
};

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
  drain: "drain",
  drains: "drain",
  dripping: "leak",
  faucet: "tap",
  garbage: "waste",
  leakage: "leak",
  leaking: "leak",
  leaks: "leak",
  overflowed: "overflow",
  overflowing: "overflow",
  potholes: "pothole",
  seepage: "leak",
  trash: "waste",
  waterlogging: "waterlog"
};

const LOCATION_KEYWORDS = new Set([
  "basement",
  "block",
  "clubhouse",
  "east",
  "floor",
  "gate",
  "gym",
  "lobby",
  "main",
  "north",
  "parking",
  "phase",
  "playground",
  "pool",
  "ramp",
  "sector",
  "south",
  "tower",
  "west"
]);

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

function issueText(issue) {
  return [
    issue.title,
    issue.description,
    issue.category,
    issue.inferredReason,
    issue.rootCause,
    ...(Array.isArray(issue.tags) ? issue.tags : [])
  ]
    .filter(Boolean)
    .join(" ");
}

function queryText({
  title = "",
  category = "",
  reason = "",
  inferredReason = "",
  description = "",
  rootCause = "",
  tags = [],
  semanticSummary = ""
}) {
  return [
    semanticSummary,
    title,
    category,
    reason || inferredReason,
    description,
    rootCause,
    ...(Array.isArray(tags) ? tags : [])
  ]
    .filter(Boolean)
    .join(" ");
}

function lexicalSimilarity(leftText, rightText) {
  const leftTokens = tokenize(leftText);
  const rightTokens = tokenize(rightText);

  if (!leftTokens.size || !rightTokens.size) return 0;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  const unionSize = new Set([...leftTokens, ...rightTokens]).size;
  const containment = overlap / Math.min(leftTokens.size, rightTokens.size);
  const jaccard = overlap / unionSize;

  return Math.min(0.99, containment * 0.72 + jaccard * 0.28);
}

function categorySimilarity(left, right) {
  if (!left || !right) return 0;
  return lexicalSimilarity(left, right);
}

function gpsLocationSimilarity(distance) {
  if (!Number.isFinite(distance)) return 0;
  if (distance <= 3) return 0.99;

  return Math.max(
    0,
    Math.min(0.99, 1 - distance / THRESHOLDS.candidateDistanceMeters)
  );
}

function extractLocationText(text) {
  const source = String(text || "").toLowerCase();
  const phrases = [];
  const phrasePattern = /\b(block|tower|gate|phase|sector|lane|floor)\s*[-#]?\s*([a-z0-9]+)\b/g;
  let match = phrasePattern.exec(source);

  while (match) {
    phrases.push(`${match[1]}-${match[2]}`);
    match = phrasePattern.exec(source);
  }

  const namedPlaces = [
    "lift lobby",
    "parking lot",
    "east gate",
    "west gate",
    "north gate",
    "south gate",
    "main gate",
    "basement ramp"
  ];

  for (const place of namedPlaces) {
    if (source.includes(place)) {
      phrases.push(place.replace(/\s+/g, "-"));
    }
  }

  const tokens = String(text || "")
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token && LOCATION_KEYWORDS.has(token));

  return [...phrases, ...tokens].join(" ");
}

function namedLocationSimilarity(leftText, rightText) {
  const leftLocationText = extractLocationText(leftText);
  const rightLocationText = extractLocationText(rightText);

  if (!leftLocationText || !rightLocationText) return 0;

  return lexicalSimilarity(leftLocationText, rightLocationText);
}

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

async function getNearbyActiveIssues({
  societyId,
  latitude,
  longitude,
  maxDistanceMeters
}) {
  const candidates = await Issue.find({
    societyId,
    status: { $in: ACTIVE_STATUSES }
  })
    .populate("creator", "name role")
    .populate("solver", "name role")
    .sort({ updatedAt: -1 })
    .limit(Number(process.env.DUPLICATE_SPATIAL_CANDIDATE_LIMIT || 200));

  return candidates
    .map((issue) => {
      const coordinates = getIssueCoordinates(issue);
      const distance = getDistanceMeters(
        Number(latitude),
        Number(longitude),
        Number(coordinates.latitude),
        Number(coordinates.longitude)
      );

      return {
        issue,
        distance
      };
    })
    .filter((candidate) => Number.isFinite(candidate.distance) && candidate.distance <= maxDistanceMeters)
    .sort((left, right) => left.distance - right.distance);
}

function mergeCandidates({ spatialCandidates, semanticNeighbors }) {
  const byIssue = new Map();

  for (const candidate of spatialCandidates) {
    byIssue.set(String(candidate.issue._id), {
      issue: candidate.issue,
      distance: candidate.distance,
      semanticSimilarity: 0
    });
  }

  for (const neighbor of semanticNeighbors) {
    const key = String(neighbor.issue?._id || "");
    if (!key || !byIssue.has(key)) continue;

    const previous = byIssue.get(key);
    previous.semanticSimilarity = Math.max(
      Number(previous.semanticSimilarity) || 0,
      Number(neighbor.semanticSimilarity) || 0
    );
  }

  return [...byIssue.values()];
}

function passesDuplicateDecision({
  distance,
  semanticSimilarity,
  textSimilarity,
  categoryScore,
  locationSimilarity,
  locationNameSimilarity,
  imageComparison
}) {
  const distancePass = distance <= THRESHOLDS.distanceMeters;
  const looseDistancePass = distance <= THRESHOLDS.candidateDistanceMeters;
  const semanticPass = semanticSimilarity >= THRESHOLDS.semantic;
  const strongSemanticPass = semanticSimilarity >= THRESHOLDS.strongSemantic;
  const textPass = textSimilarity >= THRESHOLDS.text;
  const strongTextPass = textSimilarity >= THRESHOLDS.strongText;
  const categoryPass = categoryScore >= 0.45;
  const locationPass = locationSimilarity >= 0.65;
  const strongLocationPass = locationSimilarity >= 0.8;
  const namedLocationPass = locationNameSimilarity >= 0.45;
  const imagePass =
    imageComparison.sameInfrastructureIssue &&
    imageComparison.confidence >= THRESHOLDS.imageConfidence;

  if (imagePass && looseDistancePass && (semanticPass || textPass || categoryPass)) {
    return true;
  }

  if (distancePass && strongSemanticPass && (textPass || categoryPass)) {
    return true;
  }

  if (distancePass && strongTextPass && (semanticPass || categoryPass || !semanticSimilarity)) {
    return true;
  }

  if (strongLocationPass && strongTextPass && (semanticPass || categoryPass || namedLocationPass || !semanticSimilarity)) {
    return true;
  }

  if (distancePass && namedLocationPass && (textPass || semanticPass)) {
    return true;
  }

  if (locationPass && textPass && namedLocationPass && (semanticPass || categoryPass || !semanticSimilarity)) {
    return true;
  }

  if (distance <= Math.min(35, THRESHOLDS.distanceMeters) && textPass && (semanticPass || categoryPass)) {
    return true;
  }

  return false;
}

async function findHybridDuplicate({
  societyId,
  category,
  title,
  description,
  reason,
  inferredReason,
  rootCause,
  tags = [],
  semanticSummary,
  latitude,
  longitude,
  embedding,
  currentMediaUrl
}) {
  const [semanticNeighbors, spatialCandidates] = await Promise.all([
    findSemanticNeighbors({
      societyId,
      embedding,
      limit: 30,
      resolvedOnly: false
    }),
    getNearbyActiveIssues({
      societyId,
      latitude,
      longitude,
      maxDistanceMeters: THRESHOLDS.candidateDistanceMeters
    })
  ]);

  const inputText = queryText({
    title,
    category,
    reason,
    inferredReason,
    description,
    rootCause,
    tags,
    semanticSummary
  });

  const candidates = mergeCandidates({
    spatialCandidates,
    semanticNeighbors
  })
    .map((candidate) => ({
      ...candidate,
      textSimilarity: lexicalSimilarity(inputText, issueText(candidate.issue)),
      categoryScore: categorySimilarity(category, candidate.issue.category),
      locationSimilarity: gpsLocationSimilarity(candidate.distance),
      locationNameSimilarity: namedLocationSimilarity(inputText, issueText(candidate.issue))
    }))
    .sort((left, right) => {
      const leftScore =
        (left.semanticSimilarity || 0) * 0.3 +
        (left.textSimilarity || 0) * 0.3 +
        (left.locationSimilarity || 0) * 0.25 +
        (left.locationNameSimilarity || 0) * 0.1 +
        (left.categoryScore || 0) * 0.05 -
        left.distance / 1000;
      const rightScore =
        (right.semanticSimilarity || 0) * 0.3 +
        (right.textSimilarity || 0) * 0.3 +
        (right.locationSimilarity || 0) * 0.25 +
        (right.locationNameSimilarity || 0) * 0.1 +
        (right.categoryScore || 0) * 0.05 -
        right.distance / 1000;
      return rightScore - leftScore;
    });

  for (const candidate of candidates) {
    const {
      issue,
      distance,
      textSimilarity,
      categoryScore,
      locationSimilarity,
      locationNameSimilarity
    } = candidate;
    const semanticSimilarity = Number(candidate.semanticSimilarity) || 0;

    const imageComparison = await compareIssueImages({
      existingMediaUrl: issue.mediaUrl,
      currentMediaUrl
    });

    issue.semanticSimilarity = semanticSimilarity;
    issue.imageSimilarity = imageComparison.confidence;
    issue.lastComparedAt = new Date();
    await issue.save();

    if (passesDuplicateDecision({
      distance,
      semanticSimilarity,
      textSimilarity,
      categoryScore,
      locationSimilarity,
      locationNameSimilarity,
      imageComparison
    })) {
      return {
        duplicate: true,
        issue,
        semanticSimilarity,
        textSimilarity,
        categorySimilarity: categoryScore,
        locationSimilarity,
        locationNameSimilarity,
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
    textSimilarity: null,
    categorySimilarity: null,
    locationSimilarity: null,
    locationNameSimilarity: null,
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
