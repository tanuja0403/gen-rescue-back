const OpenAI = require("openai");
const fs = require("fs");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribes audio file using OpenAI Whisper
 * @param {string} audioFilePath - Path to the audio file
 * @returns {Promise<string>} - Transcribed text
 */
const transcribeAudio = async (audioFilePath) => {
  try {
    console.log("🎤 Starting Whisper transcription...");

    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    // Create read stream
    const audioFile = fs.createReadStream(audioFilePath);

    // Call Whisper API
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // Can be made dynamic based on region
      response_format: "json",
      temperature: 0.2, // Lower temperature for more accurate transcription
    });

    console.log("✅ Whisper transcription completed");

    return response.text;
  } catch (error) {
    console.error("❌ Whisper transcription error:", error.message);

    // Handle specific error cases
    if (error.code === "ENOENT") {
      throw new Error("Audio file not found");
    }

    if (error.status === 401) {
      throw new Error("Invalid OpenAI API key");
    }

    if (error.status === 413) {
      throw new Error("Audio file too large (max 25MB)");
    }

    throw new Error(`Transcription failed: ${error.message}`);
  }
};

/**
 * Validates audio file before transcription
 * @param {string} audioFilePath - Path to the audio file
 * @returns {boolean} - True if valid
 */
const validateAudioFile = (audioFilePath) => {
  const allowedExtensions = [
    ".mp3",
    ".mp4",
    ".mpeg",
    ".mpga",
    ".m4a",
    ".wav",
    ".webm",
  ];
  const maxSize = 25 * 1024 * 1024; // 25MB

  try {
    const stats = fs.statSync(audioFilePath);

    if (stats.size > maxSize) {
      throw new Error("Audio file exceeds 25MB limit");
    }

    const ext = audioFilePath
      .toLowerCase()
      .substring(audioFilePath.lastIndexOf("."));
    if (!allowedExtensions.includes(ext)) {
      throw new Error(
        `Invalid audio format. Allowed: ${allowedExtensions.join(", ")}`
      );
    }

    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  transcribeAudio,
  validateAudioFile,
};
