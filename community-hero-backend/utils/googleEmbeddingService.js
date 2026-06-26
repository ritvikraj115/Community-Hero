// backend/utils/googleEmbeddingService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

const LEGACY_EMBEDDING_MODELS = new Set([
  "text-embedding-004"
]);

const requestedEmbeddingModel =
  process.env.GOOGLE_EMBEDDING_MODEL ||
  process.env.GEMINI_EMBEDDING_MODEL ||
  "gemini-embedding-001";

const EMBEDDING_MODEL = LEGACY_EMBEDDING_MODELS.has(requestedEmbeddingModel)
  ? "gemini-embedding-001"
  : requestedEmbeddingModel;

const EMBEDDING_DIMENSIONS = Number(
  process.env.GOOGLE_EMBEDDING_DIMENSIONS ||
  process.env.GEMINI_EMBEDDING_DIMENSIONS ||
  3072
);

const EMBEDDING_VERSION =
  process.env.GOOGLE_EMBEDDING_VERSION ||
  "google-generative-ai-v1";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

function normalizeEmbedding(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

async function generateEmbedding(text) {
  const input = String(text || "").trim();

  if (!input || !genAI) {
    return {
      embedding: [],
      dimensions: 0,
      model: EMBEDDING_MODEL,
      version: EMBEDDING_VERSION,
      createdAt: null
    };
  }

  const model = genAI.getGenerativeModel({
    model: EMBEDDING_MODEL
  });

  const result = await model.embedContent(input);
  const embedding = normalizeEmbedding(result?.embedding?.values);

  return {
    embedding,
    dimensions: embedding.length || EMBEDDING_DIMENSIONS,
    model: EMBEDDING_MODEL,
    version: EMBEDDING_VERSION,
    createdAt: new Date()
  };
}

module.exports = {
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_VERSION,
  generateEmbedding,
  normalizeEmbedding
};
