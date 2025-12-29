const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyzes SOS transcript using GPT-4o to extract structured rescue data
 * @param {string} transcript - Transcribed text from survivor
 * @param {object} metadata - Additional context (location, time, etc.)
 * @returns {Promise<object>} - Structured analysis result
 */
const analyzeSOSContent = async (transcript, metadata = {}) => {
  try {
    console.log("🤖 Starting GPT-4o analysis...");

    const systemPrompt = `You are an emergency response AI assistant analyzing SOS messages from disaster survivors. Your role is to extract critical information and assess urgency.

CRITICAL RULES:
1. Always respond with valid JSON only
2. Be extremely conservative with urgency levels
3. Extract only factual information from the message
4. Identify concrete needs and risks
5. Never make assumptions beyond what's stated

Urgency Levels:
- CRITICAL: Immediate life threat (severe injury, trapped, fire, medical emergency)
- HIGH: Serious situation requiring prompt response (injured, unsafe location, essential needs)
- MEDIUM: Needs assistance but not immediate danger (stranded, minor injuries, seeking shelter)
- LOW: General help request, information seeking`;

    const userPrompt = `Analyze this SOS message and respond with JSON only:

MESSAGE: "${transcript}"

METADATA:
- Time received: ${metadata.receivedAt || new Date().toISOString()}
- Location: ${
      metadata.location
        ? `${metadata.location.latitude}, ${metadata.location.longitude}`
        : "Unknown"
    }

Respond with this exact JSON structure:
{
  "urgency": "CRITICAL|HIGH|MEDIUM|LOW",
  "summary": "Brief 1-2 sentence summary of situation",
  "eventType": "Type of emergency (e.g., trapped, injured, fire, flood, etc.)",
  "injuryStatus": "Description of any injuries or none",
  "riskFactors": ["array", "of", "specific", "risks"],
  "needs": ["array", "of", "specific", "needs"],
  "confidence": 0.85
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    const analysis = JSON.parse(content);

    console.log("✅ GPT-4o analysis completed");

    // Validate response structure
    if (!analysis.urgency || !analysis.summary) {
      throw new Error("Invalid AI response structure");
    }

    return {
      urgency: analysis.urgency || "MEDIUM",
      summary: analysis.summary || "Unable to generate summary",
      eventType: analysis.eventType || "Unknown",
      injuryStatus: analysis.injuryStatus || "Unknown",
      riskFactors: Array.isArray(analysis.riskFactors)
        ? analysis.riskFactors
        : [],
      needs: Array.isArray(analysis.needs) ? analysis.needs : [],
      confidence: analysis.confidence || 0.5,
    };
  } catch (error) {
    console.error("❌ GPT analysis error:", error.message);

    // Return safe default for critical failures
    if (error.status === 401) {
      throw new Error("Invalid OpenAI API key");
    }

    // If JSON parsing fails, return default
    return {
      urgency: "HIGH", // Default to HIGH for safety
      summary: "AI analysis failed - requires manual review",
      eventType: "Unknown",
      injuryStatus: "Unknown",
      riskFactors: ["AI processing error"],
      needs: ["Manual review required"],
      confidence: 0.0,
    };
  }
};

/**
 * Analyzes text SOS message (no transcription needed)
 * @param {string} textMessage - Direct text SOS
 * @param {object} metadata - Additional context
 * @returns {Promise<object>} - Structured analysis result
 */
const analyzeTextSOS = async (textMessage, metadata = {}) => {
  return await analyzeSOSContent(textMessage, metadata);
};

module.exports = {
  analyzeSOSContent,
  analyzeTextSOS,
};
