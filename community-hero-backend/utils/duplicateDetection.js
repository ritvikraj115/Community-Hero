// backend/utils/duplicateDetection.js

const {
    findHybridDuplicate,
    getDistanceMeters
} = require("./hybridDuplicateDetector");

const findDuplicateIssue = async ({
    societyId,
    category,
    title,
    description,
    reason,
    inferredReason,
    rootCause,
    tags,
    semanticSummary,
    latitude,
    longitude,
    embedding,
    currentMediaUrl
}) => {

    if (latitude === undefined || longitude === undefined) {

        return {
            duplicate: false,
            issue: null,
            distance: null,
            semanticSimilarity: null,
            textSimilarity: null,
            locationSimilarity: null,
            locationNameSimilarity: null,
            imageSimilarity: null,
            imageReason:
                "Location is required for duplicate detection."
        };

    }

    return findHybridDuplicate({
        societyId,
        category,
        title,
        description,
        reason,
        inferredReason,
        rootCause,
        tags,
        semanticSummary,
        latitude,
        longitude,
        embedding: embedding || [],
        currentMediaUrl
    });

};

const detectDuplicateIssue = async (params) => {
    const result = await findDuplicateIssue(params);

    return result.duplicate ? result.issue : null;
};

module.exports = {
    detectDuplicateIssue,
    findDuplicateIssue,
    getDistanceMeters
};
