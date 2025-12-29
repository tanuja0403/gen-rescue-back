/**
 * Critical keywords that indicate high-urgency situations
 */
const CRITICAL_KEYWORDS = [
  "trapped",
  "stuck",
  "can't move",
  "cannot move",
  "bleeding",
  "blood",
  "injured",
  "hurt",
  "pain",
  "fire",
  "smoke",
  "burning",
  "flames",
  "drowning",
  "water rising",
  "flood",
  "collapsed",
  "rubble",
  "debris",
  "unconscious",
  "not breathing",
  "chest pain",
  "help",
  "emergency",
  "urgent",
  "dying",
  "broken",
  "fracture",
  "severe",
  "earthquake",
  "aftershock",
];

const HIGH_KEYWORDS = [
  "lost",
  "stranded",
  "alone",
  "cold",
  "freezing",
  "hypothermia",
  "dehydrated",
  "thirsty",
  "no water",
  "hungry",
  "no food",
  "scared",
  "afraid",
  "panic",
  "shelter",
  "nowhere to go",
  "supplies",
  "medication",
  "medicine",
];

/**
 * Validates AI analysis output with rule-based safety checks
 * @param {object} aiAnalysis - AI-generated analysis
 * @param {string} transcript - Original transcript
 * @returns {object} - Validation results with flags
 */
const validateAIAnalysis = (aiAnalysis, transcript) => {
  const transcriptLower = transcript.toLowerCase();

  // Check for critical keywords
  const hasCriticalKeywords = CRITICAL_KEYWORDS.some((keyword) =>
    transcriptLower.includes(keyword.toLowerCase())
  );

  const hasHighKeywords = HIGH_KEYWORDS.some((keyword) =>
    transcriptLower.includes(keyword.toLowerCase())
  );

  // Confidence threshold check
  const meetsThreshold = aiAnalysis.confidence >= 0.6;

  // Determine if manual review is needed
  let manualReview = false;
  let adjustedUrgency = aiAnalysis.urgency;

  // Override rules: Escalate if critical keywords found but AI rated low
  if (
    hasCriticalKeywords &&
    (aiAnalysis.urgency === "LOW" || aiAnalysis.urgency === "MEDIUM")
  ) {
    console.warn("⚠️  Critical keywords detected - escalating urgency");
    adjustedUrgency = "CRITICAL";
    manualReview = true;
  }

  // Flag for review if confidence is low
  if (aiAnalysis.confidence < 0.5) {
    console.warn("⚠️  Low confidence analysis - flagging for manual review");
    manualReview = true;
  }

  // Flag for review if no clear event type identified
  if (!aiAnalysis.eventType || aiAnalysis.eventType === "Unknown") {
    manualReview = true;
  }

  return {
    hasKeywords: hasCriticalKeywords || hasHighKeywords,
    hasCriticalKeywords,
    hasHighKeywords,
    meetsThreshold,
    manualReview,
    adjustedUrgency,
    validationPassed: true,
    warnings: generateWarnings(aiAnalysis, hasCriticalKeywords, meetsThreshold),
  };
};

/**
 * Generates validation warnings
 * @param {object} aiAnalysis - AI analysis
 * @param {boolean} hasCriticalKeywords - Critical keyword presence
 * @param {boolean} meetsThreshold - Confidence threshold met
 * @returns {array} - Array of warning messages
 */
const generateWarnings = (aiAnalysis, hasCriticalKeywords, meetsThreshold) => {
  const warnings = [];

  if (!meetsThreshold) {
    warnings.push("Low confidence in AI analysis");
  }

  if (hasCriticalKeywords && aiAnalysis.urgency !== "CRITICAL") {
    warnings.push(
      "Critical keywords detected but urgency not marked as CRITICAL"
    );
  }

  if (!aiAnalysis.eventType || aiAnalysis.eventType === "Unknown") {
    warnings.push("Unable to determine event type");
  }

  if (!aiAnalysis.needs || aiAnalysis.needs.length === 0) {
    warnings.push("No specific needs identified");
  }

  return warnings;
};

/**
 * Validates SOS data before processing
 * @param {object} sosData - SOS request data
 * @returns {object} - Validation result
 */
const validateSOSData = (sosData) => {
  const errors = [];

  // Check required fields
  if (!sosData.sessionId) {
    errors.push("Session ID is required");
  }

  if (!sosData.sosType) {
    errors.push("SOS type is required");
  }

  if (
    !sosData.location ||
    !sosData.location.latitude ||
    !sosData.location.longitude
  ) {
    errors.push("Location data is required");
  }

  // Validate location coordinates
  if (sosData.location) {
    const { latitude, longitude } = sosData.location;

    if (latitude < -90 || latitude > 90) {
      errors.push("Invalid latitude value");
    }

    if (longitude < -180 || longitude > 180) {
      errors.push("Invalid longitude value");
    }
  }

  // Validate SOS type
  const validTypes = ["voice", "text", "photo"];
  if (sosData.sosType && !validTypes.includes(sosData.sosType)) {
    errors.push(`Invalid SOS type. Must be one of: ${validTypes.join(", ")}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateAIAnalysis,
  validateSOSData,
  CRITICAL_KEYWORDS,
  HIGH_KEYWORDS,
};
