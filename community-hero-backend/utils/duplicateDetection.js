// backend/utils/duplicateDetection.js

const {
    findHybridDuplicate,
    getDistanceMeters
} = require("./hybridDuplicateDetector");

const findDuplicateIssue = async ({
    societyId,
    category,
    latitude,
    longitude,
    embedding,
    currentMediaUrl
}) => {

    if (!embedding?.length || !currentMediaUrl) {

        return {
            duplicate: false,
            issue: null,
            distance: null,
            semanticSimilarity: null,
            imageSimilarity: null,
            imageReason:
                "Embedding and image are required for hybrid duplicate detection."
        };

    }

    return findHybridDuplicate({
        societyId,
        category,
        latitude,
        longitude,
        embedding,
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
