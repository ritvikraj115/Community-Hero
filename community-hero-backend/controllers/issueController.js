const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Society = require('../models/Society');
const UserHistory = require('../models/UserHistory');
const IssueHistory = require('../models/IssueHistory');
const ResolutionVerification = require('../models/ResolutionVerification');
const { findDuplicateIssue } = require("../utils/duplicateDetection");
const {
  normalizeTags,
  buildIssueSemanticSummary,
  buildIssueEmbedding
} = require("../utils/embeddingService");
const {
  getHistoricalRecommendations,
  enrichResolvedIssueKnowledge
} = require("../utils/knowledgeBaseService");
const {
  rewardIssueCreation,
  rewardIssueClaim,
  rewardIssueResolution,
  rewardApprovalVote,
  rewardResolutionVote
} = require("../utils/gamification");
const {
  notifyResidents,
  notifyAdmin,
  notifyUser,
  sendIssueCreatedNotification,
  sendIssueApprovedNotification,
  sendResolutionNotification
} = require("../utils/notificationService");
const {
  logEvent,
  logIssueCreated,
  logDuplicateIssue,
  logClaim,
  logResolution
} = require("../utils/auditLogger");
const {
  updateCommunityHistory
} = require("../utils/communityHistoryService");

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

const logSoftFailure = (label, error) => {
  console.error(`${label}:`, error?.message || error);
};

const settleSideEffects = async (steps) => {
  const results = await Promise.allSettled(
    steps.map(({ run }) => run())
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logSoftFailure(steps[index].label, result.reason);
    }
  });
};

const fileToGenerativePart = (buffer, mimeType) => ({
  inlineData: {
    data: buffer.toString('base64'),
    mimeType
  }
});

const dataUrlToGenerativePart = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }

  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*);base64/);
  const mimeType = mimeMatch?.[1] || 'image/jpeg';

  return {
    inlineData: {
      data: base64,
      mimeType
    }
  };
};

const getEligibleResidentCount = async (societyId) => {
  return User.countDocuments({
    societyId,
    role: 'resident',
    joinStatus: 'approved'
  });
};

const createIssueEvent = ({ action, status, note, performedBy, metadata = {} }) => ({
  action,
  status,
  note,
  performedBy,
  metadata
});

const appendIssueEvent = (issue, event) => {
  issue.timeline.push(event);
  issue.history.push(event);
};

const toIdString = (value) => {
  if (!value) return '';
  return String(value._id || value);
};

const isResolutionTeamMember = (issue, userId) => {
  const id = toIdString(userId);
  if (!id) return false;

  if (toIdString(issue.solver) === id) return true;

  return (issue.helpers || []).some((helper) => toIdString(helper.user) === id);
};

const populateIssueResponse = (query) => query
  .populate('creator', 'name role')
  .populate('solver', 'name role')
  .populate('helpers.user', 'name role')
  .populate('helpRequestedBy', 'name role')
  .populate('resolutionSubmittedBy', 'name role');

const recordIssueHistory = async ({
  issue,
  action,
  performedBy = null,
  previousStatus = '',
  currentStatus = issue.status,
  notes = '',
  aiData = {}
}) => {
  await IssueHistory.create({
    issue: issue._id,
    societyId: issue.societyId,
    action,
    performedBy,
    previousStatus,
    currentStatus,
    notes,
    aiData
  });
};

const recordUserHistory = async ({
  user,
  issue,
  action,
  pointsAwarded = 0,
  description = '',
  metadata = {}
}) => {
  if (!user || !issue) return;

  await UserHistory.create({
    user,
    issue: issue._id,
    societyId: issue.societyId,
    action,
    pointsAwarded,
    description,
    metadata
  });
};

const createIssue = async (req, res) => {
  try {
    if (req.user.role !== 'resident') {
      return res.status(403).json({
        error: 'Action blocked: only residents can create issues.'
      });
    }

    if (!req.user.societyId || req.user.joinStatus !== 'approved') {
      return res.status(403).json({
        error: 'You must be approved in a community before creating issues.'
      });
    }

    const { title, description, latitude, longitude } = req.body;
    const userId = req.user.id;
    const societyId = req.user.societyId;

    if (!req.file) {
      return res.status(400).json({ error: 'An image is required.' });
    }

    if (!description || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Description and location are required.' });
    }

    const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);

    let aiResponse = {
      isImageRelevant: true,
      rejectionReason: '',
      category: 'General Civic Issue',
      severityScore: 5,
      inferredReason: 'AI analysis unavailable, fallback classification used.',
      rootCause: '',
      risk: 'MEDIUM',
      tags: [],
      shortExplanation: ''
    };

    if (genAI) {
      try {
        const reasonSchema = {
          type: SchemaType.OBJECT,
          properties: {
            isImageRelevant: {
              type: SchemaType.BOOLEAN,
              description:
                'Return true ONLY if the image matches the user description of the civic issue.'
            },
            rejectionReason: {
              type: SchemaType.STRING,
              description: 'If image is irrelevant, explain in one sentence.'
            },
            category: { type: SchemaType.STRING },
            severityScore: { type: SchemaType.INTEGER },
            inferredReason: { type: SchemaType.STRING },
            rootCause: { type: SchemaType.STRING },
            risk: { type: SchemaType.STRING },
            tags: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.STRING
              }
            },
            shortExplanation: { type: SchemaType.STRING }
          },
          required: [
            'isImageRelevant',
            'rejectionReason',
            'category',
            'severityScore',
            'inferredReason',
            'rootCause',
            'risk',
            'tags',
            'shortExplanation'
          ]
        };

        const model = genAI.getGenerativeModel({
          model: GEMINI_MODEL,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: reasonSchema
          }
        });

        const prompt = `Analyze this image against the user's civic issue claim: "${description}". First check whether the image is relevant. Then return strict JSON with category, severityScore, inferredReason, rootCause, risk, tags, and shortExplanation. Use concise civic infrastructure language.`;

        const result = await model.generateContent([prompt, imagePart]);
        aiResponse = JSON.parse(result.response.text());
      } catch (error) {
        logSoftFailure('Issue image AI analysis failed, using fallback classification', error);
      }
    }

    if (aiResponse.isImageRelevant === false) {
      return res.status(400).json({
        error: 'Image Validation Failed by AI',
        aiReason: aiResponse.rejectionReason
      });
    }

    const normalizedTags = normalizeTags(aiResponse.tags);
    const currentMediaUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const embeddingInput = {
      category: aiResponse.category,
      inferredReason: aiResponse.inferredReason,
      reason: aiResponse.inferredReason,
      description: description.trim(),
      rootCause: aiResponse.rootCause,
      tags: normalizedTags
    };
    let embeddingData = {
      semanticSummary: buildIssueSemanticSummary(embeddingInput),
      embedding: [],
      embeddingDimensions: 0,
      embeddingModel: '',
      embeddingVersion: '',
      embeddingCreatedAt: null
    };

    try {
      embeddingData = await buildIssueEmbedding(embeddingInput);
    } catch (error) {
      logSoftFailure('Issue embedding failed, continuing without vector search', error);
    }

    let historicalRecommendations = [];
    try {
      historicalRecommendations = await getHistoricalRecommendations({
        societyId,
        embedding: embeddingData.embedding,
        category: aiResponse.category,
        limit: 5
      });
    } catch (error) {
      logSoftFailure('Historical recommendation lookup failed', error);
    }

    let duplicate = {
      duplicate: false,
      issue: null,
      distance: null,
      semanticSimilarity: null,
      imageSimilarity: null,
      imageReason: ''
    };

    try {
      duplicate = await findDuplicateIssue({
        societyId,
        category: aiResponse.category,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        embedding: embeddingData.embedding,
        currentMediaUrl
      });
    } catch (error) {
      logSoftFailure('Duplicate detection failed, creating issue as new', error);
    }

    if (duplicate.duplicate) {
      const existingIssue = duplicate.issue;
      const reporterAlreadyMerged = existingIssue.duplicateReporters.some(
        (id) => id.toString() === userId.toString()
      );

      if (!reporterAlreadyMerged) {
        existingIssue.duplicateReporters.push(userId);
        existingIssue.duplicateCount += 1;
      }

      const mergedAlreadyRecorded = existingIssue.mergedReporters.some(
        (id) => id.toString() === userId.toString()
      );

      if (!mergedAlreadyRecorded) {
        existingIssue.mergedReporters.push(userId);
      }

      existingIssue.duplicateReports.push({
        reporter: userId,
        description: description.trim(),
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        semanticSimilarity: duplicate.semanticSimilarity,
        imageSimilarity: duplicate.imageSimilarity,
        distance: duplicate.distance,
        reportedAt: new Date()
      });
      existingIssue.mergedLocations.push({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        reportedAt: new Date()
      });
      existingIssue.mergedDescriptions.push({
        description: description.trim(),
        reportedAt: new Date()
      });
      existingIssue.duplicateMerged = true;
      existingIssue.semanticSimilarity = duplicate.semanticSimilarity;
      existingIssue.imageSimilarity = duplicate.imageSimilarity;
      existingIssue.lastComparedAt = new Date();
      appendIssueEvent(
        existingIssue,
        createIssueEvent({
          action: 'DUPLICATE_DETECTED',
          status: existingIssue.status,
          note: 'Duplicate report merged into existing issue.',
          performedBy: userId,
          metadata: {
            distanceMeters: duplicate.distance,
            category: aiResponse.category,
            semanticSimilarity: duplicate.semanticSimilarity,
            imageSimilarity: duplicate.imageSimilarity,
            imageReason: duplicate.imageReason
          }
        })
      );

      await existingIssue.save();
      await settleSideEffects([
        {
          label: 'Duplicate issue history failed',
          run: () => recordIssueHistory({
            issue: existingIssue,
            action: 'DUPLICATE_DETECTED',
            performedBy: userId,
            currentStatus: existingIssue.status,
            notes: 'Duplicate report merged into existing issue.',
            aiData: {
              category: aiResponse.category,
              severityScore: Number(aiResponse.severityScore) || 5,
              inferredReason: aiResponse.inferredReason
            }
          })
        },
        {
          label: 'Duplicate audit log failed',
          run: () => logEvent({
            actor: userId,
            societyId,
            issue: existingIssue._id,
            action: 'ISSUE_DUPLICATE',
            resourceType: 'ISSUE',
            resourceId: existingIssue._id,
            description: 'Duplicate issue report merged.',
            metadata: {
              distanceMeters: duplicate.distance,
              semanticSimilarity: duplicate.semanticSimilarity,
              imageSimilarity: duplicate.imageSimilarity,
              imageReason: duplicate.imageReason
            },
            req
          })
        },
        {
          label: 'Duplicate legacy audit log failed',
          run: () => logDuplicateIssue(existingIssue, req)
        },
        {
          label: 'Duplicate creator notification failed',
          run: () => notifyUser(
            existingIssue.creator,
            'Duplicate Report Merged',
            'A new resident report was merged into your existing issue.',
            'ISSUE_DUPLICATE',
            {
              issue: existingIssue._id,
              societyId,
              priority: 'MEDIUM',
              actionUrl: `/issues/${existingIssue._id}`
            }
          )
        },
        {
          label: 'Duplicate solver notification failed',
          run: () => existingIssue.solver
            ? notifyUser(
              existingIssue.solver,
              'Duplicate Report Added',
              'A duplicate report was added to the issue you are handling.',
              'ISSUE_DUPLICATE',
              {
                issue: existingIssue._id,
                societyId,
                priority: 'MEDIUM',
                actionUrl: `/issues/${existingIssue._id}`
              }
            )
            : Promise.resolve()
        },
        {
          label: 'Duplicate admin notification failed',
          run: () => notifyAdmin({
            societyId,
            issue: existingIssue._id,
            title: 'Duplicate Report Merged',
            message: 'Hybrid duplicate detection merged a resident report into an existing issue.',
            type: 'ISSUE_DUPLICATE',
            priority: 'MEDIUM',
            actionUrl: `/issues/${existingIssue._id}`
          })
        }
      ]);

      return res.status(200).json({
        duplicate: true,
        issue: existingIssue,
        duplicateIssue: existingIssue,
        existingIssue: existingIssue._id,
        semanticSimilarity: duplicate.semanticSimilarity,
        imageSimilarity: duplicate.imageSimilarity,
        distance: duplicate.distance,
        matchedReason: duplicate.imageReason,
        matchedSolution: historicalRecommendations[0]?.solution || '',
        historicalRecommendations,
        duplicateCount: existingIssue.duplicateCount,
        distanceMeters: duplicate.distance
      });

    }

    const issueTitle = (title && title.trim()) || description.trim().slice(0, 60);

    const issue = await Issue.create({
      title: issueTitle,
      creator: userId,
      societyId,
      description: description.trim(),
      mediaUrl: currentMediaUrl,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      category: aiResponse.category || 'General Civic Issue',
      severityScore: Number(aiResponse.severityScore) || 5,
      inferredReason: aiResponse.inferredReason || '',
      rootCause: aiResponse.rootCause || '',
      risk: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(aiResponse.risk || '').toUpperCase())
        ? String(aiResponse.risk).toUpperCase()
        : 'UNKNOWN',
      tags: normalizedTags,
      aiShortExplanation: aiResponse.shortExplanation || '',
      aiMetadata: aiResponse,
      semanticSummary: embeddingData.semanticSummary,
      embedding: embeddingData.embedding,
      embeddingDimensions: embeddingData.embeddingDimensions,
      embeddingModel: embeddingData.embeddingModel,
      embeddingVersion: embeddingData.embeddingVersion,
      embeddingCreatedAt: embeddingData.embeddingCreatedAt,
      historicalSimilarity: historicalRecommendations[0]?.similarity || null,
      status: 'Pending Approval',
      requiredApprovalVotes: 20,
      requiredResolutionVotes: 50,
      aiConfidenceScore: null,
      currentVotes: [],
      approvalVoters: [],
      resolutionVoters: [],
      timeline: [
        createIssueEvent({
          action: 'CREATED',
          status: 'Pending Approval',
          note: 'Issue created and submitted for community approval.',
          performedBy: userId,
          metadata: {
            category: aiResponse.category,
            severityScore: Number(aiResponse.severityScore) || 5
          }
        })
      ],
      history: [
        createIssueEvent({
          action: 'CREATED',
          status: 'Pending Approval',
          note: 'Issue created and submitted for community approval.',
          performedBy: userId,
          metadata: {
            category: aiResponse.category,
            severityScore: Number(aiResponse.severityScore) || 5
          }
        })
      ],
      comments: []
    });

    await settleSideEffects([
      {
        label: 'Issue creation reward failed',
        run: () => rewardIssueCreation(userId)
      },
      {
        label: 'Issue creation notification failed',
        run: () => sendIssueCreatedNotification(issue)
      },
      {
        label: 'Issue creation audit log failed',
        run: () => logIssueCreated(issue, req)
      },
      {
        label: 'Issue history create failed',
        run: () => recordIssueHistory({
          issue,
          action: 'CREATED',
          performedBy: userId,
          currentStatus: issue.status,
          notes: 'Issue created and pending community approval.',
          aiData: {
            category: issue.category,
            severityScore: issue.severityScore,
            inferredReason: issue.inferredReason
          }
        })
      },
      {
        label: 'User history create failed',
        run: () => recordUserHistory({
          user: userId,
          issue,
          action: 'ISSUE_CREATED',
          pointsAwarded: 15,
          description: 'Reported a new community issue.',
          metadata: {
            category: issue.category,
            severityScore: issue.severityScore,
            reason: issue.inferredReason
          }
        })
      }
    ]);

    return res.status(201).json({
      duplicate: false,
      message: 'Issue created successfully.',
      issue,
      historicalRecommendations
    });
  } catch (error) {
    console.error('Create issue error:', error);
    return res.status(500).json({
      error: 'Processing failed.',
      detail: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};


const getIssues = async (req, res) => {
  try {
    const issues = await populateIssueResponse(
      Issue.find({
        societyId: req.user.societyId,
        status: { $nin: ['Resolved', 'Rejected'] }
      })
    ).sort({ createdAt: -1 });

    return res.json(issues);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch issues' });
  }
};

const getIssueById = async (req, res) => {
  try {
    const issue = await populateIssueResponse(
      Issue.findOne({
        _id: req.params.issueId,
        societyId: req.user.societyId
      })
    ).populate('comments.user', 'name role');

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found.' });
    }

    return res.json(issue);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load issue.' });
  }
};

const voteApproval = async (req, res) => {
  try {
    if (req.user.role !== 'resident') {
      return res.status(403).json({ error: 'Only residents can vote.' });
    }

    const issue = await Issue.findOne({
      _id: req.params.issueId,
      societyId: req.user.societyId
    });

    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    if (issue.status !== 'Pending Approval') {
      return res.status(400).json({ error: 'Approval voting is closed for this issue.' });
    }

    const voterId = req.user.id.toString();
    if (issue.creator?.toString() === voterId) {
      return res.status(403).json({ error: 'Issue creators cannot vote to approve their own issue.' });
    }

    const alreadyVoted = issue.approvalVoters.some((id) => id.toString() === voterId);
    if (alreadyVoted) {
      return res.status(400).json({ error: 'You already voted for this issue.' });
    }

    const previousStatus = issue.status;

    issue.approvalVoters.push(req.user.id);
    issue.currentVotes = [...issue.approvalVoters];

    const totalApprovedResidents = await getEligibleResidentCount(issue.societyId);
    const neededVotes = Math.max(1, Math.ceil((totalApprovedResidents * issue.requiredApprovalVotes) / 100));

    if (issue.approvalVoters.length >= neededVotes) {
      issue.status = 'Open';
      issue.currentVotes = [];
      appendIssueEvent(
        issue,
        createIssueEvent({
          action: 'APPROVED',
          status: issue.status,
          note: 'Community approval threshold reached.',
          performedBy: req.user.id,
          metadata: {
            requiredVotes: neededVotes,
            receivedVotes: issue.approvalVoters.length
          }
        })
      );
    }

    await issue.save();

    await rewardApprovalVote(req.user.id);
    await recordUserHistory({
      user: req.user.id,
      issue,
      action: 'APPROVAL_VOTED',
      pointsAwarded: 4,
      description: 'Voted on issue approval.'
    });

    if (issue.status === 'Open') {
      await sendIssueApprovedNotification(issue);
      await recordIssueHistory({
        issue,
        action: 'APPROVED',
        performedBy: req.user.id,
        previousStatus,
        currentStatus: issue.status,
        notes: 'Community approval threshold reached.'
      });
    }

    return res.json(issue);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to vote on issue.' });
  }
};

const claimIssue = async (req, res) => {
  try {
    if (req.user.role !== 'resident') {
      return res.status(403).json({ error: 'Only residents can take responsibility.' });
    }

    const issue = await Issue.findOne({
      _id: req.params.issueId,
      societyId: req.user.societyId
    });

    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    if (!['Open', 'In Progress'].includes(issue.status)) {
      return res.status(400).json({ error: 'Only open or in-progress issues can be joined.' });
    }

    if (isResolutionTeamMember(issue, req.user.id)) {
      return res.status(400).json({ error: 'You are already on this resolution team.' });
    }

    const previousStatus = issue.status;
    const joiningAsHelper = Boolean(issue.solver);

    if (joiningAsHelper) {
      issue.helpers.push({
        user: req.user.id,
        requestedBy: issue.helpRequestedBy || null
      });
    } else {
      issue.solver = req.user.id;
      issue.claimedAt = new Date();
    }

    issue.status = 'In Progress';
    if (req.body.estimatedCompletion) {
      issue.estimatedCompletion = req.body.estimatedCompletion;
    }
    if (req.body.resourcesNeeded !== undefined) {
      issue.resourcesNeeded = req.body.resourcesNeeded || '';
    }
    if (joiningAsHelper) {
      issue.helpRequested = false;
    }

    appendIssueEvent(
      issue,
      createIssueEvent({
        action: 'CLAIMED',
        status: issue.status,
        note: joiningAsHelper
          ? 'Resident joined the resolution team.'
          : 'Resident took responsibility for the issue.',
        performedBy: req.user.id,
        metadata: {
          role: joiningAsHelper ? 'helper' : 'solver',
          estimatedCompletion: issue.estimatedCompletion,
          resourcesNeeded: issue.resourcesNeeded
        }
      })
    );
    await issue.save();

    await rewardIssueClaim(req.user.id);
    await recordUserHistory({
      user: req.user.id,
      issue,
      action: 'ISSUE_CLAIMED',
      pointsAwarded: 10,
      description: joiningAsHelper
        ? 'Joined a resolution team.'
        : 'Claimed responsibility for an issue.'
    });
    await recordIssueHistory({
      issue,
      action: 'CLAIMED',
      performedBy: req.user.id,
      previousStatus,
      currentStatus: issue.status,
      notes: joiningAsHelper ? 'Resident joined the resolution team.' : 'Resident claimed the issue.'
    });
    await notifyResidents({
      societyId: issue.societyId,
      issue: issue._id,
      title: joiningAsHelper ? 'Resident Joined Resolution Team' : 'Issue Claimed',
      message: joiningAsHelper
        ? `${req.user.name} joined the team resolving an issue.`
        : `${req.user.name} has taken responsibility for resolving an issue.`,
      type: 'ISSUE_CLAIMED',
      priority: 'MEDIUM',
      actionUrl: `/issues/${issue._id}`
    });
    await logClaim(issue, req.user, req);

    await issue.populate('solver', 'name role');
    await issue.populate('helpers.user', 'name role');
    await issue.populate('helpRequestedBy', 'name role');

    return res.json(issue);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to claim issue.' });
  }
};

const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    const issue = await Issue.findOne({
      _id: req.params.issueId,
      societyId: req.user.societyId
    });

    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    if (issue.status === 'Pending Approval') {
      return res.status(400).json({ error: 'Comments are locked until the issue is open.' });
    }

    issue.comments.push({
      user: req.user.id,
      text: text.trim()
    });
    appendIssueEvent(
      issue,
      createIssueEvent({
        action: 'COMMENT_ADDED',
        status: issue.status,
        note: text.trim(),
        performedBy: req.user.id
      })
    );

    await issue.save();
    await issue.populate('comments.user', 'name role');

    await recordUserHistory({
      user: req.user.id,
      issue,
      action: 'COMMENTED',
      description: 'Commented on an issue.'
    });
    await recordIssueHistory({
      issue,
      action: 'COMMENT_ADDED',
      performedBy: req.user.id,
      currentStatus: issue.status,
      notes: text.trim()
    });

    return res.json(issue.comments);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to add comment.' });
  }
};

const requestIssueHelp = async (req, res) => {
  try {
    const issue = await Issue.findOne({
      _id: req.params.issueId,
      societyId: req.user.societyId
    });

    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    if (!['Open', 'In Progress'].includes(issue.status)) {
      return res.status(400).json({ error: 'Help can only be requested for active issues.' });
    }

    const canRequestHelp = req.user.role === 'admin' || isResolutionTeamMember(issue, req.user.id);
    if (!canRequestHelp) {
      return res.status(403).json({ error: 'Only admins or resolution team members can request help.' });
    }

    const note = String(req.body.note || req.body.helpRequestNote || '').trim();

    issue.helpRequested = true;
    issue.helpRequestedBy = req.user.id;
    issue.helpRequestedAt = new Date();
    issue.helpRequestNote = note;

    appendIssueEvent(
      issue,
      createIssueEvent({
        action: 'HELP_REQUESTED',
        status: issue.status,
        note: note || 'Additional community help requested.',
        performedBy: req.user.id
      })
    );

    await issue.save();
    await notifyResidents({
      societyId: issue.societyId,
      issue: issue._id,
      title: 'Help Requested',
      message: note || 'More community members are needed to help resolve an issue.',
      type: 'SYSTEM',
      priority: 'MEDIUM',
      actionUrl: `/issues/${issue._id}`
    });

    await issue.populate('helpRequestedBy', 'name role');
    return res.json(issue);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to request help.' });
  }
};

const submitResolution = async (req, res) => {
  try {
    const issue = await Issue.findOne({
      _id: req.params.issueId,
      societyId: req.user.societyId
    });

    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    const isAdmin = req.user.role === 'admin';
    const isTeamMember = isResolutionTeamMember(issue, req.user.id);
    if (!isAdmin && !isTeamMember) {
      return res.status(403).json({ error: 'Only admins or resolution team members can submit a fix.' });
    }

    if (!['Open', 'In Progress'].includes(issue.status)) {
      return res.status(400).json({ error: 'Issue must be active before a fix can be submitted.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Resolved image is required.' });
    }

    const submittedSummary = String(req.body.resolutionSummary || req.body.summary || '').trim();
    if (!submittedSummary) {
      return res.status(400).json({ error: 'Describe what was fixed before uploading the resolution.' });
    }

    const originalPart = dataUrlToGenerativePart(issue.mediaUrl);
    const resolvedPart = fileToGenerativePart(req.file.buffer, req.file.mimetype);

    let aiConfidenceScore = 50;
    let resolutionExplanation = '';

    if (genAI && originalPart) {
      const compareSchema = {
        type: SchemaType.OBJECT,
        properties: {
          confidence_score: { type: SchemaType.INTEGER },
          isFixValid: { type: SchemaType.BOOLEAN },
          reason: { type: SchemaType.STRING }
        },
        required: ['confidence_score', 'isFixValid', 'reason']
      };

      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: compareSchema
        }
      });

      const prompt = `Compare the original issue image and the resolved/fixed image. Return a confidence_score from 0-100 for whether the problem is genuinely fixed. Consider spoofing, old images, and structural relevance.`;

      try {
        const result = await model.generateContent([prompt, originalPart, resolvedPart]);
        const parsed = JSON.parse(result.response.text());
        aiConfidenceScore = Number(parsed.confidence_score) || 50;
        resolutionExplanation = parsed.reason || '';
      } catch (error) {
        logSoftFailure('Resolution image AI analysis failed, using fallback confidence', error);
      }
    } else if (req.body.aiConfidenceScore) {
      aiConfidenceScore = Number(req.body.aiConfidenceScore) || 50;
    }

    const previousStatus = issue.status;

    if (!issue.solver) {
      issue.solver = req.user.id;
      issue.claimedAt = new Date();
    }

    issue.resolvedMediaUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    issue.aiConfidenceScore = aiConfidenceScore;
    issue.requiredResolutionVotes = aiConfidenceScore > 85 ? 20 : 50;
    issue.resolutionSummary = submittedSummary;
    issue.resolutionExplanation = resolutionExplanation || issue.resolutionSummary;
    issue.resolutionSubmittedBy = req.user.id;
    issue.resolutionConfidence = aiConfidenceScore;
    issue.resolutionQuality = aiConfidenceScore;
    issue.status = 'Pending Verification';
    issue.helpRequested = false;
    issue.currentVotes = [];
    issue.resolutionVoters = [];
    appendIssueEvent(
      issue,
      createIssueEvent({
        action: 'RESOLUTION_SUBMITTED',
        status: issue.status,
        note: submittedSummary,
        performedBy: req.user.id,
        metadata: {
          aiConfidenceScore,
          requiredResolutionVotes: issue.requiredResolutionVotes
        }
      })
    );

    await enrichResolvedIssueKnowledge(issue);
    await issue.save();
    const totalEligibleVoters = await getEligibleResidentCount(issue.societyId);
    const requiredVotes = Math.max(
      1,
      Math.ceil((totalEligibleVoters * issue.requiredResolutionVotes) / 100)
    );

    await ResolutionVerification.findOneAndUpdate(
      {
        issue: issue._id
      },
      {
        issue: issue._id,
        solver: issue.solver || req.user.id,
        societyId: issue.societyId,
        beforeImage: issue.mediaUrl,
        afterImage: issue.resolvedMediaUrl,
        aiVerified: aiConfidenceScore >= 50,
        confidenceScore: aiConfidenceScore,
        aiAnalysis: issue.resolutionSummary,
        requiredVotePercentage: issue.requiredResolutionVotes,
        totalEligibleVoters,
        requiredVotes,
        receivedVotes: 0,
        status: 'PENDING_COMMUNITY'
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    await sendResolutionNotification(issue);
    await logResolution(issue, req);
    await recordIssueHistory({
      issue,
      action: 'RESOLUTION_SUBMITTED',
      performedBy: req.user.id,
      previousStatus,
      currentStatus: issue.status,
      notes: 'Resolution submitted for verification.',
      aiData: {
        confidenceScore: aiConfidenceScore
      }
    });

    return res.json(issue);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to submit resolution.' });
  }
};

const voteResolution = async (req, res) => {
  try {
    if (req.user.role !== 'resident') {
      return res.status(403).json({ error: 'Only residents can vote.' });
    }

    const issue = await Issue.findOne({
      _id: req.params.issueId,
      societyId: req.user.societyId
    });

    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    if (issue.status !== 'Pending Verification') {
      return res.status(400).json({ error: 'Resolution voting is not active.' });
    }

    const voterId = req.user.id.toString();
    if (isResolutionTeamMember(issue, voterId) || toIdString(issue.resolutionSubmittedBy) === voterId) {
      return res.status(403).json({ error: 'Resolvers cannot vote to verify their own resolution.' });
    }

    const alreadyVoted = issue.resolutionVoters.some((id) => id.toString() === voterId);
    if (alreadyVoted) {
      return res.status(400).json({ error: 'You already voted on this resolution.' });
    }

    const previousStatus = issue.status;

    issue.resolutionVoters.push(req.user.id);
    issue.currentVotes = [...issue.resolutionVoters];

    const totalApprovedResidents = await getEligibleResidentCount(issue.societyId);
    const neededVotes = Math.max(1, Math.ceil((totalApprovedResidents * issue.requiredResolutionVotes) / 100));

    if (issue.resolutionVoters.length >= neededVotes) {
      issue.status = 'Resolved';
      issue.currentVotes = [];
      await enrichResolvedIssueKnowledge(issue);
      appendIssueEvent(
        issue,
        createIssueEvent({
          action: 'RESOLVED',
          status: issue.status,
          note: 'Community verified the submitted resolution.',
          performedBy: req.user.id,
          metadata: {
            requiredVotes: neededVotes,
            receivedVotes: issue.resolutionVoters.length
          }
        })
      );

      const creditedResolvers = [
        toIdString(issue.solver),
        ...(issue.helpers || []).map((helper) => toIdString(helper.user))
      ].filter(Boolean);

      const uniqueResolvers = [...new Set(creditedResolvers)];
      for (const resolverId of uniqueResolvers) {
        await rewardIssueResolution(resolverId);
        await recordUserHistory({
          user: resolverId,
          issue,
          action: 'ISSUE_RESOLVED',
          pointsAwarded: 50,
          description: 'Issue resolution was verified by the community.'
        });
      }
    }

    await issue.save();

    await rewardResolutionVote(req.user.id);
    await recordUserHistory({
      user: req.user.id,
      issue,
      action: 'RESOLUTION_VOTED',
      pointsAwarded: 4,
      description: 'Voted on issue resolution.'
    });
    await ResolutionVerification.findOneAndUpdate(
      {
        issue: issue._id
      },
      {
        receivedVotes: issue.resolutionVoters.length,
        status: issue.status === 'Resolved' ? 'APPROVED' : 'PENDING_COMMUNITY',
        verifiedAt: issue.status === 'Resolved' ? new Date() : null
      }
    );

    if (issue.status === 'Resolved') {
      await updateCommunityHistory(issue);
      await notifyResidents({
        societyId: issue.societyId,
        issue: issue._id,
        title: 'Issue Resolved',
        message: 'Community verification approved a submitted resolution.',
        type: 'RESOLUTION_APPROVED',
        priority: 'HIGH',
        actionUrl: `/issues/${issue._id}`
      });
      await recordIssueHistory({
        issue,
        action: 'RESOLVED',
        performedBy: req.user.id,
        previousStatus,
        currentStatus: issue.status,
        notes: 'Community verification approved the submitted resolution.'
      });
    }

    return res.json(issue);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to vote on resolution.' });
  }
};

const setAdminDeadline = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can set deadlines.' });
    }

    const { issueId } = req.params;
    const { deadlineDate } = req.body;

    const issue = await Issue.findOne({
      _id: issueId,
      societyId: req.user.societyId
    });
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    const previousStatus = issue.status;

    issue.deadline = deadlineDate ? new Date(deadlineDate) : null;
    if (issue.status === 'Pending Approval') {
      issue.status = 'Open';
    }
    appendIssueEvent(
      issue,
      createIssueEvent({
        action: 'DEADLINE_SET',
        status: issue.status,
        note: issue.deadline ? `Deadline set to ${issue.deadline.toISOString()}.` : 'Deadline cleared.',
        performedBy: req.user.id
      })
    );

    await issue.save();

    await recordIssueHistory({
      issue,
      action: 'DEADLINE_SET',
      performedBy: req.user.id,
      previousStatus,
      currentStatus: issue.status,
      notes: issue.deadline ? `Deadline set to ${issue.deadline.toISOString()}.` : 'Deadline cleared.'
    });
    await logEvent({
      actor: req.user.id,
      societyId: issue.societyId,
      issue: issue._id,
      action: 'DEADLINE_SET',
      resourceType: 'ISSUE',
      resourceId: issue._id,
      description: 'Admin set issue deadline.',
      req
    });

    return res.status(200).json({ message: 'Deadline enforced successfully.', issue });
  } catch (error) {
    console.error('Deadline error:', error);
    return res.status(500).json({ error: 'Failed to set deadline.' });
  }
};

module.exports = {
  createIssue,
  getIssues,
  getIssueById,
  voteApproval,
  claimIssue,
  addComment,
  requestIssueHelp,
  submitResolution,
  voteResolution,
  setAdminDeadline
};
