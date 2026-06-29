// backend/utils/imageComparisonService.js

const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const VISION_MODEL =
  process.env.GEMINI_VISION_MODEL ||
  process.env.GEMINI_MODEL ||
  "gemini-3.1-flash-lite";

const SUPPORTED_VISION_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif"
]);

function dataUrlToGenerativePart(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    return null;
  }

  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*);base64/);
  const mimeType = mimeMatch?.[1] || "image/jpeg";

  if (!SUPPORTED_VISION_MIME_TYPES.has(mimeType)) {
    return null;
  }

  return {
    inlineData: {
      data: base64,
      mimeType
    }
  };
}

async function compareIssueImages({
  existingMediaUrl,
  currentMediaUrl
}) {
  if (!genAI || !existingMediaUrl || !currentMediaUrl) {
    return {
      sameInfrastructureIssue: false,
      confidence: 0,
      reason: "Image comparison unavailable."
    };
  }

  const existingPart = dataUrlToGenerativePart(existingMediaUrl);
  const currentPart = dataUrlToGenerativePart(currentMediaUrl);

  if (!existingPart || !currentPart) {
    return {
      sameInfrastructureIssue: false,
      confidence: 0,
      reason: "Images are not available as comparable data URLs."
    };
  }

  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      sameInfrastructureIssue: {
        type: SchemaType.BOOLEAN
      },
      confidence: {
        type: SchemaType.INTEGER
      },
      reason: {
        type: SchemaType.STRING
      }
    },
    required: [
      "sameInfrastructureIssue",
      "confidence",
      "reason"
    ]
  };

  const model = genAI.getGenerativeModel({
    model: VISION_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema
    }
  });

  const prompt = [
    "Compare these two civic issue images.",
    "Return whether they show the same physical infrastructure issue, such as the same pothole, drain, transformer, leak, or garbage dump.",
    "Be strict. Similar category is not enough. Same location/object must be visually likely.",
    "Return confidence from 0 to 100 and one concise reason."
  ].join(" ");

  try {
    const result = await model.generateContent([
      prompt,
      existingPart,
      currentPart
    ]);

    const parsed = JSON.parse(result.response.text());

    return {
      sameInfrastructureIssue: Boolean(parsed.sameInfrastructureIssue),
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
      reason: parsed.reason || ""
    };
  } catch (error) {
    console.error("Image comparison failed:", error.message);
    return {
      sameInfrastructureIssue: false,
      confidence: 0,
      reason: "Image comparison failed; semantic duplicate check continued."
    };
  }
}

module.exports = {
  compareIssueImages
};
