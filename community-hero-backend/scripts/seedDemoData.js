require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Alert = require("../models/Alert");
const AuditLog = require("../models/AuditLog");
const CommunityAnalytics = require("../models/CommunityAnalytics");
const CommunityInsight = require("../models/CommunityInsights");
const Issue = require("../models/Issue");
const IssueHistory = require("../models/IssueHistory");
const Leaderboard = require("../models/Leaderboard");
const MaintenanceTask = require("../models/MaintenanceTask");
const Notification = require("../models/Notification");
const ResolutionVerification = require("../models/ResolutionVerification");
const Society = require("../models/Society");
const User = require("../models/User");
const UserHistory = require("../models/UserHistory");
const Vote = require("../models/Vote");

const DEMO_DOMAIN = "demo.communityhero.local";
const PASSWORD = "Demo@12345";
const RADIUS_METERS = Number(process.env.DEMO_RADIUS_METERS || 180);
const now = new Date();
const day = 24 * 60 * 60 * 1000;

const at = (daysOffset, hoursOffset = 0) => new Date(now.getTime() + daysOffset * day + hoursOffset * 60 * 60 * 1000);

const parseCoordinate = (value, min, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
};

const offsetPoint = (center, eastMeters, northMeters) => {
  const latitude = center.latitude + northMeters / 111320;
  const longitude = center.longitude + eastMeters / (111320 * Math.cos(center.latitude * Math.PI / 180));
  return { latitude, longitude };
};

const toPoint = ({ latitude, longitude }) => ({
  type: "Point",
  coordinates: [Number(longitude.toFixed(7)), Number(latitude.toFixed(7))]
});

const svgDataUrl = (title, fill, accent) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560"><rect width="900" height="560" fill="${fill}"/><rect x="56" y="64" width="788" height="380" rx="28" fill="#ffffff" opacity="0.9"/><circle cx="730" cy="132" r="54" fill="${accent}" opacity="0.24"/><rect x="94" y="124" width="416" height="26" rx="13" fill="${accent}"/><rect x="94" y="186" width="626" height="18" rx="9" fill="#64748b" opacity="0.32"/><rect x="94" y="232" width="548" height="18" rx="9" fill="#64748b" opacity="0.24"/><rect x="94" y="318" width="704" height="70" rx="16" fill="${accent}" opacity="0.17"/><text x="94" y="495" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#0f172a">${title}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

const embedding = (seed) => {
  const values = [];
  for (let index = 0; index < 3072; index += 1) {
    const raw = Math.sin((index + 1) * seed) + Math.cos((index + seed) / 11);
    values.push(Number((raw / 2).toFixed(6)));
  }
  return values;
};

const issueEvent = (action, status, note, performedBy, daysOffset, metadata = {}) => ({
  action,
  status,
  note,
  performedBy,
  metadata,
  createdAt: at(daysOffset)
});

async function getSeedCenter() {
  const envLat = parseCoordinate(process.env.DEMO_CENTER_LAT, -90, 90);
  const envLng = parseCoordinate(process.env.DEMO_CENTER_LNG, -180, 180);
  if (envLat !== null && envLng !== null) {
    return { latitude: envLat, longitude: envLng, source: "env" };
  }

  const existingSociety = await Society.findOne({}).sort({ updatedAt: -1 }).lean();
  const [existingLng, existingLat] = existingSociety?.location?.coordinates || [];
  const lat = parseCoordinate(existingLat, -90, 90);
  const lng = parseCoordinate(existingLng, -180, 180);
  if (lat !== null && lng !== null) {
    return { latitude: lat, longitude: lng, source: `existing society ${existingSociety._id}` };
  }

  throw new Error(
    "No demo center found. Create a society from Admin Setup first, or run with DEMO_CENTER_LAT and DEMO_CENTER_LNG set to your real test location."
  );
}

async function clearDatabase() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(
    collections
      .filter((collection) => !collection.collectionName.startsWith("system."))
      .map((collection) => collection.deleteMany({}))
  );
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const center = await getSeedCenter();
  await clearDatabase();

  const password = await bcrypt.hash(PASSWORD, 10);
  const admin = await User.create({
    name: "Aarav Demo Admin",
    email: `admin@${DEMO_DOMAIN}`,
    password,
    role: "admin",
    joinStatus: "approved",
    gamificationPoints: 260,
    lastKnownLocation: {
      latitude: center.latitude,
      longitude: center.longitude,
      verifiedAt: at(0)
    }
  });

  const society = await Society.create({
    name: "Community Hero Radius QA Sandbox",
    admin: admin._id,
    location: toPoint(center),
    radiusInMeters: RADIUS_METERS,
    geofenceMode: "radius",
    boundary: undefined,
    communityDetails: {
      totalBlocks: 6,
      drainageType: "Covered drains with open inspection chambers",
      knownVulnerabilities: [
        "Basement waterlogging after heavy rain",
        "Outdoor lighting moisture ingress",
        "Waste overflow near gate during evening peak"
      ]
    },
    maintenanceSchedule: []
  });

  const userDefs = [
    ["Ritika Sharma", "resident1", 355],
    ["Kabir Menon", "resident2", 295],
    ["Meera Iyer", "resident3", 186],
    ["Dev Patel", "resident4", 142],
    ["Nisha Rao", "resident5", 81],
    ["Pending Priya", "pending", 0],
    ["Join Flow Jay", "joinflow", 0]
  ];

  await User.findByIdAndUpdate(admin._id, {
    societyId: society._id,
    joinStatus: "approved"
  });

  const users = { admin: await User.findById(admin._id) };
  for (const [name, key, points] of userDefs) {
    const pending = key === "pending";
    const noCommunity = key === "joinflow";
    users[key] = await User.create({
      name,
      email: `${key}@${DEMO_DOMAIN}`,
      password,
      role: "resident",
      societyId: pending || noCommunity ? null : society._id,
      pendingSocietyId: pending ? society._id : null,
      joinStatus: pending ? "pending" : noCommunity ? "none" : "approved",
      gamificationPoints: points,
      issuesReported: key === "resident1" ? 3 : 1,
      issuesResolved: key === "resident2" ? 2 : key === "resident3" ? 1 : 0,
      issuesVerified: key === "resident4" ? 3 : 1,
      lastKnownLocation: noCommunity
        ? undefined
        : {
          latitude: center.latitude,
          longitude: center.longitude,
          verifiedAt: at(-1)
        }
    });
  }

  const locations = {
    drain: offsetPoint(center, 28, 36),
    tap: offsetPoint(center, -42, -34),
    light: offsetPoint(center, 74, -18),
    waste: offsetPoint(center, -84, 62),
    lift: offsetPoint(center, 12, -82),
    road: offsetPoint(center, 98, 24)
  };

  const baseIssue = ({
    title,
    creator,
    status,
    category,
    severityScore,
    inferredReason,
    rootCause,
    risk,
    tags,
    point,
    daysOffset,
    seed,
    solver = null,
    helpers = [],
    approvalVoters = [],
    resolutionVoters = [],
    resolutionSummary = "",
    resolutionSubmittedBy = null,
    aiConfidenceScore = null,
    requiredResolutionVotes = 50,
    duplicate = false,
    helpRequested = false
  }) => {
    const issueEmbedding = embedding(seed);
    const events = [
      issueEvent("CREATED", "Pending Approval", "Issue created and submitted for approval.", creator, daysOffset, {
        category,
        severityScore
      })
    ];

    if (status !== "Pending Approval") {
      events.push(issueEvent("APPROVED", "Open", "Community approval threshold reached.", users.resident4._id, daysOffset + 1));
    }
    if (solver) {
      events.push(issueEvent("CLAIMED", "In Progress", "Resident took responsibility for the issue.", solver, daysOffset + 2));
    }
    if (resolutionSummary) {
      events.push(issueEvent("RESOLUTION_SUBMITTED", "Pending Verification", resolutionSummary, resolutionSubmittedBy || solver, daysOffset + 3, {
        aiConfidenceScore
      }));
    }
    if (status === "Resolved") {
      events.push(issueEvent("RESOLVED", "Resolved", "Community verified the submitted resolution.", users.resident5._id, daysOffset + 4));
    }

    return {
      title,
      creator,
      societyId: society._id,
      description: `${title}. Seeded QA report inside a ${RADIUS_METERS}m community radius.`,
      mediaUrl: svgDataUrl(title, "#eef6ff", "#2563eb"),
      resolvedMediaUrl: resolutionSummary ? svgDataUrl(`Fixed: ${title}`, "#ecfdf5", "#10b981") : null,
      location: toPoint(point),
      category,
      severityScore,
      inferredReason,
      rootCause,
      risk,
      tags,
      aiShortExplanation: `Gemini demo analysis: ${inferredReason}`,
      aiMetadata: {
        isImageRelevant: true,
        category,
        severityScore,
        inferredReason,
        rootCause,
        risk,
        tags,
        shortExplanation: `Demo AI classified this as ${category}.`
      },
      priority: risk === "CRITICAL" ? "CRITICAL" : risk === "HIGH" ? "HIGH" : "MEDIUM",
      status,
      solver,
      helpers: helpers.map((helper) => ({
        user: helper,
        joinedAt: at(daysOffset + 2, 2),
        requestedBy: solver || users.admin._id
      })),
      helpRequested,
      helpRequestedBy: helpRequested ? solver || users.admin._id : null,
      helpRequestedAt: helpRequested ? at(-1) : null,
      helpRequestNote: helpRequested ? "Need one more resident nearby to help finish faster." : "",
      claimedAt: solver ? at(daysOffset + 2) : null,
      estimatedCompletion: solver ? at(2) : null,
      resourcesNeeded: solver ? "Safety cones, gloves, and one maintenance toolkit." : "",
      requiredApprovalVotes: 20,
      requiredResolutionVotes,
      aiConfidenceScore,
      resolutionSummary,
      resolutionExplanation: resolutionSummary ? `Gemini demo verification: ${resolutionSummary}` : "",
      resolutionSubmittedBy,
      resolutionQuality: aiConfidenceScore,
      resolutionConfidence: aiConfidenceScore,
      semanticSummary: `${category}. ${inferredReason}. ${rootCause}.`,
      embedding: issueEmbedding,
      embeddingDimensions: issueEmbedding.length,
      embeddingModel: "gemini-embedding-001",
      embeddingVersion: "demo-seed",
      embeddingCreatedAt: at(daysOffset),
      resolutionEmbedding: resolutionSummary ? embedding(seed + 0.17) : [],
      resolutionEmbeddingDimensions: resolutionSummary ? 3072 : 0,
      resolutionEmbeddingModel: resolutionSummary ? "gemini-embedding-001" : "",
      resolutionEmbeddingVersion: resolutionSummary ? "demo-seed" : "",
      resolutionEmbeddingCreatedAt: resolutionSummary ? at(daysOffset + 3) : null,
      historicalSimilarity: status === "Resolved" ? 0.96 : 0.91,
      imageSimilarity: duplicate ? 94 : null,
      semanticSimilarity: duplicate ? 0.93 : null,
      lastComparedAt: duplicate ? at(-1) : null,
      approvalVoters,
      resolutionVoters,
      currentVotes: status === "Pending Approval" ? approvalVoters : status === "Pending Verification" ? resolutionVoters : [],
      duplicateCount: duplicate ? 2 : 0,
      duplicateReporters: duplicate ? [users.resident3._id, users.resident5._id] : [],
      duplicateMerged: duplicate,
      duplicateReports: duplicate ? [
        {
          reporter: users.resident3._id,
          description: "Same drain is overflowing near the basement ramp.",
          location: { latitude: point.latitude, longitude: point.longitude },
          semanticSimilarity: 0.93,
          imageSimilarity: 94,
          distance: 13,
          reportedAt: at(-1)
        }
      ] : [],
      mergedReporters: duplicate ? [users.resident3._id, users.resident5._id] : [],
      mergedLocations: duplicate ? [{ latitude: point.latitude, longitude: point.longitude, reportedAt: at(-1) }] : [],
      mergedDescriptions: duplicate ? [{ description: "Basement side drain is still blocked.", reportedAt: at(-1) }] : [],
      timeline: events,
      history: events,
      comments: [
        {
          user: users.resident4._id,
          text: "Demo comment: adding visibility for coordination."
        },
        {
          user: users.admin._id,
          text: "Admin note: seeded inside the community radius for map verification."
        }
      ],
      createdAt: at(daysOffset),
      updatedAt: status === "Resolved" ? at(daysOffset + 4) : at(-1)
    };
  };

  const issues = await Issue.insertMany([
    baseIssue({
      title: "Basement drain overflowing near Block B",
      creator: users.resident1._id,
      status: "Open",
      category: "Drainage",
      severityScore: 82,
      inferredReason: "The drain grate is clogged with silt and plastic waste after heavy rainfall.",
      rootCause: "Preventive cleaning was missed before heavy runoff.",
      risk: "HIGH",
      tags: ["drainage", "waterlogging", "basement"],
      point: locations.drain,
      daysOffset: -5,
      seed: 1.13,
      approvalVoters: [users.resident2._id, users.resident3._id],
      duplicate: true
    }),
    baseIssue({
      title: "Clubhouse drinking-water tap leaking",
      creator: users.resident3._id,
      status: "Resolved",
      category: "Water Infrastructure",
      severityScore: 68,
      inferredReason: "The faucet has a steady leak, indicating worn washer seals and potential valve failure.",
      rootCause: "Aging washer seal and loose spindle packing.",
      risk: "MEDIUM",
      tags: ["tap", "water", "leak"],
      point: locations.tap,
      daysOffset: -18,
      seed: 2.17,
      solver: users.resident2._id,
      helpers: [users.resident4._id],
      approvalVoters: [users.resident1._id, users.resident4._id],
      resolutionVoters: [users.resident1._id, users.resident5._id],
      resolutionSummary: "Replaced the washer, tightened spindle packing, flushed the line, and verified no dripping.",
      resolutionSubmittedBy: users.resident2._id,
      aiConfidenceScore: 91,
      requiredResolutionVotes: 20
    }),
    baseIssue({
      title: "Pathway light flickering near Tower 3",
      creator: users.resident5._id,
      status: "In Progress",
      category: "Electrical",
      severityScore: 61,
      inferredReason: "The outdoor lighting circuit is unstable, likely due to moisture ingress in a junction box.",
      rootCause: "Loose terminal and moisture exposure after rain.",
      risk: "HIGH",
      tags: ["lighting", "electrical", "safety"],
      point: locations.light,
      daysOffset: -3,
      seed: 3.31,
      solver: users.resident2._id,
      helpers: [users.resident3._id],
      approvalVoters: [users.resident1._id, users.resident4._id],
      helpRequested: true
    }),
    baseIssue({
      title: "Waste overflow near east gate",
      creator: users.resident4._id,
      status: "Pending Approval",
      category: "Waste Management",
      severityScore: 54,
      inferredReason: "Collection bin capacity is exceeded during evening peak disposal.",
      rootCause: "Pickup frequency is lower than resident disposal volume.",
      risk: "MEDIUM",
      tags: ["waste", "sanitation", "east gate"],
      point: locations.waste,
      daysOffset: -1,
      seed: 4.41,
      approvalVoters: [users.resident1._id]
    }),
    baseIssue({
      title: "Lift lobby floor repaired after seepage",
      creator: users.resident1._id,
      status: "Pending Verification",
      category: "Lift",
      severityScore: 73,
      inferredReason: "Water seepage near the lift lobby created a slip hazard and electrical proximity risk.",
      rootCause: "Condensate drain was routed too close to lobby tile joints.",
      risk: "HIGH",
      tags: ["lift", "seepage", "slip hazard"],
      point: locations.lift,
      daysOffset: -7,
      seed: 5.53,
      solver: users.resident3._id,
      approvalVoters: [users.resident2._id, users.resident4._id],
      resolutionVoters: [users.resident5._id],
      resolutionSummary: "Sealed tile joints, rerouted condensate drain, dried the area, and added warning signage until cured.",
      resolutionSubmittedBy: users.resident3._id,
      aiConfidenceScore: 78,
      requiredResolutionVotes: 50
    }),
    baseIssue({
      title: "Internal road pothole patched near Gate 2",
      creator: users.resident2._id,
      status: "Resolved",
      category: "Road",
      severityScore: 57,
      inferredReason: "The asphalt surface failed due to repeated water pooling and vehicle load at the turn.",
      rootCause: "Poor drainage gradient caused edge weakening.",
      risk: "MEDIUM",
      tags: ["road", "pothole", "gate"],
      point: locations.road,
      daysOffset: -28,
      seed: 6.61,
      solver: users.resident4._id,
      approvalVoters: [users.resident1._id, users.resident3._id],
      resolutionVoters: [users.resident2._id, users.resident5._id],
      resolutionSummary: "Cleaned loose aggregate, filled the pothole with cold mix, compacted the patch, and marked the turn.",
      resolutionSubmittedBy: users.resident4._id,
      aiConfidenceScore: 88,
      requiredResolutionVotes: 20
    })
  ]);

  const [drainIssue, tapIssue, lightIssue, wasteIssue, liftIssue, roadIssue] = issues;

  const maintenance = await MaintenanceTask.insertMany([
    {
      societyId: society._id,
      createdBy: users.admin._id,
      title: "Clean basement stormwater drains",
      description: "Pre-rain drain cleaning for basement ramp and Block B.",
      category: "Drainage",
      priority: "HIGH",
      scheduledDate: at(1),
      deadline: at(3),
      assignedTo: users.resident2._id,
      status: "SCHEDULED",
      location: toPoint(offsetPoint(center, 34, 42))
    },
    {
      societyId: society._id,
      createdBy: users.admin._id,
      title: "Inspect lift lobby seepage seal",
      description: "Confirm repaired joints remain dry after use.",
      category: "Lift",
      priority: "MEDIUM",
      scheduledDate: at(-2),
      deadline: at(-1),
      assignedTo: users.resident3._id,
      status: "CONVERTED_TO_ISSUE",
      autoGeneratedIssue: liftIssue._id,
      location: toPoint(offsetPoint(center, 18, -90))
    },
    {
      societyId: society._id,
      createdBy: users.admin._id,
      title: "Replace pathway junction box gasket",
      description: "Resolve moisture ingress in outdoor lighting.",
      category: "Electrical",
      priority: "CRITICAL",
      scheduledDate: at(0),
      deadline: at(2),
      assignedTo: users.resident2._id,
      status: "IN_PROGRESS",
      autoGeneratedIssue: lightIssue._id,
      location: toPoint(offsetPoint(center, 78, -24))
    },
    {
      societyId: society._id,
      createdBy: users.admin._id,
      title: "Audit waste pickup timing",
      description: "Check evening bin capacity near east gate.",
      category: "Cleaning",
      priority: "MEDIUM",
      scheduledDate: at(4),
      deadline: at(6),
      assignedTo: users.resident5._id,
      status: "SCHEDULED",
      autoGeneratedIssue: wasteIssue._id,
      location: toPoint(offsetPoint(center, -90, 68))
    }
  ]);

  await CommunityInsight.insertMany([
    {
      societyId: society._id,
      category: "Drainage",
      inferredReason: "Clogged drains after rainfall",
      totalOccurrences: 4,
      resolvedOccurrences: 2,
      averageResolutionHours: 18,
      lastOccurrence: at(-5),
      commonSolution: "Pre-rain desilting and grate cleaning",
      averageSeverity: 78,
      aiConfidenceAverage: 88
    },
    {
      societyId: society._id,
      category: "Water Infrastructure",
      inferredReason: "Washer seal wear in shared taps",
      totalOccurrences: 3,
      resolvedOccurrences: 3,
      averageResolutionHours: 7,
      lastOccurrence: at(-18),
      lastResolved: at(-14),
      commonSolution: "Replace washer, tighten spindle packing, and flush the line",
      averageSeverity: 62,
      aiConfidenceAverage: 91
    }
  ]);

  await ResolutionVerification.insertMany([
    {
      issue: liftIssue._id,
      solver: users.resident3._id,
      societyId: society._id,
      beforeImage: liftIssue.mediaUrl,
      afterImage: liftIssue.resolvedMediaUrl,
      aiVerified: true,
      confidenceScore: 78,
      aiAnalysis: "Repair looks plausible but needs community verification.",
      requiredVotePercentage: 50,
      totalEligibleVoters: 5,
      requiredVotes: 3,
      receivedVotes: 1,
      status: "PENDING_COMMUNITY"
    },
    {
      issue: tapIssue._id,
      solver: users.resident2._id,
      societyId: society._id,
      beforeImage: tapIssue.mediaUrl,
      afterImage: tapIssue.resolvedMediaUrl,
      aiVerified: true,
      confidenceScore: 91,
      aiAnalysis: "No visible leak after repair.",
      requiredVotePercentage: 20,
      totalEligibleVoters: 5,
      requiredVotes: 1,
      receivedVotes: 2,
      status: "APPROVED",
      verifiedAt: at(-14)
    }
  ]);

  await Vote.insertMany([
    { issueId: drainIssue._id, voter: users.resident2._id, societyId: society._id, voteType: "INITIAL_APPROVAL", vote: true, location: center },
    { issueId: drainIssue._id, voter: users.resident3._id, societyId: society._id, voteType: "INITIAL_APPROVAL", vote: true, location: center },
    { issueId: wasteIssue._id, voter: users.resident1._id, societyId: society._id, voteType: "INITIAL_APPROVAL", vote: true, location: center },
    { issueId: tapIssue._id, voter: users.resident5._id, societyId: society._id, voteType: "RESOLUTION_APPROVAL", vote: true, location: center },
    { issueId: roadIssue._id, voter: users.resident5._id, societyId: society._id, voteType: "RESOLUTION_APPROVAL", vote: true, location: center }
  ]);

  await Notification.insertMany([
    {
      recipient: users.admin._id,
      societyId: society._id,
      issue: drainIssue._id,
      title: "Duplicate Report Merged",
      message: "A new drain report was merged into your active issue.",
      type: "ISSUE_DUPLICATE",
      priority: "MEDIUM",
      actionUrl: `/issues/${drainIssue._id}`
    },
    {
      recipient: users.resident3._id,
      societyId: society._id,
      issue: liftIssue._id,
      title: "Resolution Waiting Verification",
      message: "Community verification is now required.",
      type: "RESOLUTION_PENDING",
      priority: "HIGH",
      actionUrl: `/issues/${liftIssue._id}`
    },
    {
      recipient: users.resident2._id,
      societyId: society._id,
      issue: lightIssue._id,
      title: "Help Requested",
      message: "Additional community help was requested for the pathway light issue.",
      type: "ISSUE_CLAIMED",
      priority: "HIGH",
      actionUrl: `/issues/${lightIssue._id}`
    }
  ]);

  await Alert.insertMany([
    {
      societyId: society._id,
      title: "Rain Risk Watch",
      message: "Drainage issue density is high near the basement ramp.",
      severity: "HIGH",
      relatedIssue: drainIssue._id
    }
  ]);

  await MaintenanceTask.updateMany(
    { _id: { $in: maintenance.map((task) => task._id) } },
    { $set: { updatedAt: now } }
  );

  await IssueHistory.insertMany(issues.flatMap((issue) => issue.history.map((event) => ({
    issue: issue._id,
    societyId: society._id,
    action: event.action === "RESOLUTION_SUBMITTED" ? "RESOLUTION_SUBMITTED" : event.action,
    performedBy: event.performedBy,
    previousStatus: "",
    currentStatus: event.status,
    notes: event.note,
    aiData: {
      category: issue.category,
      severityScore: issue.severityScore,
      inferredReason: issue.inferredReason,
      confidenceScore: issue.aiConfidenceScore || 85
    },
    createdAt: event.createdAt,
    updatedAt: event.createdAt
  }))));

  await UserHistory.insertMany([
    { user: users.resident1._id, issue: drainIssue._id, societyId: society._id, action: "ISSUE_CREATED", pointsAwarded: 15, description: "Reported basement drain overflow.", metadata: { category: "Drainage", severityScore: 82 } },
    { user: users.resident2._id, issue: tapIssue._id, societyId: society._id, action: "ISSUE_RESOLVED", pointsAwarded: 50, description: "Resolved clubhouse tap leak.", metadata: { category: "Water Infrastructure", aiConfidence: 91 } },
    { user: users.resident2._id, issue: lightIssue._id, societyId: society._id, action: "ISSUE_CLAIMED", pointsAwarded: 10, description: "Claimed pathway lighting repair.", metadata: { category: "Electrical", severityScore: 61 } },
    { user: users.resident3._id, issue: liftIssue._id, societyId: society._id, action: "ISSUE_CLAIMED", pointsAwarded: 10, description: "Submitted lift lobby fix.", metadata: { category: "Lift", aiConfidence: 78 } },
    { user: users.resident4._id, issue: roadIssue._id, societyId: society._id, action: "ISSUE_RESOLVED", pointsAwarded: 50, description: "Resolved Gate 2 pothole.", metadata: { category: "Road", aiConfidence: 88 } },
    { user: users.resident5._id, issue: liftIssue._id, societyId: society._id, action: "RESOLUTION_VOTED", pointsAwarded: 4, description: "Voted on lift lobby verification.", metadata: { category: "Lift" } }
  ]);

  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const leaderboardUsers = [users.resident1, users.resident2, users.resident3, users.resident4, users.resident5]
    .sort((left, right) => right.gamificationPoints - left.gamificationPoints);

  await Leaderboard.insertMany(leaderboardUsers.map((user, index) => ({
    societyId: society._id,
    user: user._id,
    month,
    year,
    issueCreatedPoints: user.email.startsWith("resident1") ? 45 : 15,
    issueClaimPoints: user.email.startsWith("resident2") ? 20 : 10,
    issueResolutionPoints: user.email.startsWith("resident2") || user.email.startsWith("resident4") ? 100 : 0,
    votingPoints: Math.max(0, user.gamificationPoints - 120),
    totalPoints: user.gamificationPoints,
    issuesCreated: user.email.startsWith("resident1") ? 3 : 1,
    issuesResolved: user.email.startsWith("resident2") ? 2 : user.email.startsWith("resident4") ? 1 : 0,
    issuesClaimed: user.email.startsWith("resident2") ? 2 : 1,
    votesCast: 2 + index,
    currentRank: index + 1
  })));

  await CommunityAnalytics.create({
    societyId: society._id,
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    issueMetrics: {
      created: issues.length,
      approved: 4,
      resolved: 2,
      duplicatePrevented: 2
    },
    votingMetrics: {
      approvalVotes: 8,
      resolutionVotes: 5,
      averageApprovalPercentage: 62
    },
    aiMetrics: {
      averageSeverity: 66,
      averageConfidence: 88,
      duplicateDetectionRate: 31
    },
    engagement: {
      activeResidents: 5,
      comments: 12,
      issueClaims: 3
    },
    maintenance: {
      scheduled: 2,
      completed: 0,
      overdue: 1
    }
  });

  await AuditLog.insertMany([
    {
      actor: users.admin._id,
      societyId: society._id,
      action: "CREATE_SOCIETY",
      resourceType: "SOCIETY",
      resourceId: society._id,
      description: "Seeded radius-based QA community."
    },
    {
      actor: users.resident1._id,
      societyId: society._id,
      issue: drainIssue._id,
      action: "ISSUE_CREATED",
      resourceType: "ISSUE",
      resourceId: drainIssue._id,
      description: "Seeded active issue for duplicate detection demo."
    },
    {
      actor: users.resident2._id,
      societyId: society._id,
      issue: tapIssue._id,
      action: "RESOLUTION_APPROVED",
      resourceType: "ISSUE",
      resourceId: tapIssue._id,
      description: "Seeded resolved issue for history and knowledge base."
    }
  ]);

  const outside = offsetPoint(center, RADIUS_METERS + 260, 0);

  console.log("Demo data reset successfully.");
  console.log(`Center source: ${center.source}`);
  console.log(`Society ID: ${society._id}`);
  console.log(`Center: ${center.latitude}, ${center.longitude}`);
  console.log(`Radius meters: ${RADIUS_METERS}`);
  console.log(`Outside QA point: ${outside.latitude}, ${outside.longitude}`);
  console.log(`Password for every demo account: ${PASSWORD}`);
  console.table([
    { role: "admin", email: `admin@${DEMO_DOMAIN}` },
    { role: "resident approved", email: `resident1@${DEMO_DOMAIN}` },
    { role: "resident approved", email: `resident2@${DEMO_DOMAIN}` },
    { role: "resident approved", email: `resident3@${DEMO_DOMAIN}` },
    { role: "resident approved", email: `resident4@${DEMO_DOMAIN}` },
    { role: "resident approved", email: `resident5@${DEMO_DOMAIN}` },
    { role: "resident pending", email: `pending@${DEMO_DOMAIN}` },
    { role: "join flow resident", email: `joinflow@${DEMO_DOMAIN}` }
  ]);

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error("Demo seed failed:", error);
  await mongoose.connection.close();
  process.exit(1);
});
