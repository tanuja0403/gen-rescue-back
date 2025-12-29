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

// const axios = require("axios");
// const FormData = require("form-data");
// const fs = require("fs");
// const path = require("path");

// const HF_MODEL = process.env.HF_WHISPER_MODEL || "openai/whisper-large-v2";
// const HF_API_KEY = process.env.HF_API_KEY; // required

// /**
//  * Transcribe audio using Hugging Face Inference API
//  * @param {string} audioFilePath
//  * @returns {Promise<string>}
//  */
// const transcribeAudio = async (audioFilePath) => {
//   try {
//     console.log("🎤 Starting Hugging Face Whisper transcription...");

//     if (!HF_API_KEY) {
//       throw new Error("Missing Hugging Face API key (HF_API_KEY)");
//     }

//     if (!fs.existsSync(audioFilePath)) {
//       throw new Error(`Audio file not found: ${audioFilePath}`);
//     }

//     // Validate extension/size
//     validateAudioFile(audioFilePath);

//     // Prepare multipart form
//     const form = new FormData();
//     form.append("file", fs.createReadStream(audioFilePath));

//     // HF inference endpoint for model
//     const url = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

//     // Do the request
//     const res = await axios.post(url, form, {
//       headers: {
//         Authorization: `Bearer ${HF_API_KEY}`,
//         ...form.getHeaders(),
//       },
//       maxBodyLength: Infinity,
//       timeout: 120000, // 2 minutes, adjust as needed
//       // Some HF models accept query params or additional headers; adjust if needed
//     });

//     // HF responses may vary by model; handle common shapes
//     const data = res.data;

//     // Common response patterns:
//     // 1) { "text": "transcribed text" }
//     // 2) plain string (res.data is string)
//     // 3) [ { "generated_text": "..." } ] or { "generated_text": "..." }
//     if (!data) {
//       throw new Error("Empty response from Hugging Face inference API");
//     }

//     // handle case 1
//     if (typeof data === "object" && typeof data.text === "string") {
//       console.log("✅ HF transcription completed (text field)");
//       return data.text;
//     }

//     // handle case 2
//     if (typeof data === "string") {
//       console.log("✅ HF transcription completed (plain string)");
//       return data;
//     }

//     // handle case 3
//     if (
//       Array.isArray(data) &&
//       data[0] &&
//       typeof data[0].generated_text === "string"
//     ) {
//       console.log("✅ HF transcription completed (array.generated_text)");
//       return data[0].generated_text;
//     }
//     if (typeof data === "object" && typeof data.generated_text === "string") {
//       console.log("✅ HF transcription completed (generated_text)");
//       return data.generated_text;
//     }

//     // fallback: try to find a text-like property
//     const txt = JSON.stringify(data);
//     // Attempt simple heuristics: if we find a 'text:' pattern
//     const match = txt.match(/"text"\s*:\s*"([^"]+)"/);
//     if (match && match[1]) {
//       return match[1];
//     }

//     throw new Error("Unexpected HF response structure: " + txt);
//   } catch (error) {
//     console.error("❌ HF Whisper transcription error:", error.message);

//     const status = error.response && error.response.status;

//     if (status === 401) {
//       throw new Error("Invalid Hugging Face API key (401)");
//     }
//     if (status === 429) {
//       throw new Error("Hugging Face rate limit exceeded (429)");
//     }
//     if (status === 413) {
//       throw new Error("Audio file too large (HTTP 413)");
//     }

//     // For file system errors
//     if (error.code === "ENOENT") {
//       throw new Error("Audio file not found");
//     }

//     throw new Error(`Transcription failed: ${error.message}`);
//   }
// };

// /**
//  * Validates audio file before transcription
//  * @param {string} audioFilePath
//  * @returns {boolean} - True if valid, else throws
//  */
// const validateAudioFile = (audioFilePath) => {
//   const allowedExtensions = [
//     ".mp3",
//     ".mp4",
//     ".mpeg",
//     ".mpga",
//     ".m4a",
//     ".wav",
//     ".webm",
//     ".ogg",
//   ];
//   const maxSize = 25 * 1024 * 1024; // 25MB (adjust if needed)

//   try {
//     const stats = fs.statSync(audioFilePath);

//     if (!stats.isFile()) {
//       throw new Error("Path is not a file");
//     }

//     if (stats.size > maxSize) {
//       throw new Error("Audio file exceeds 25MB limit");
//     }

//     const ext = path.extname(audioFilePath).toLowerCase();
//     if (!allowedExtensions.includes(ext)) {
//       throw new Error(
//         `Invalid audio format. Allowed: ${allowedExtensions.join(", ")}`
//       );
//     }

//     return true;
//   } catch (error) {
//     throw error;
//   }
// };

// module.exports = {
//   transcribeAudio,
//   validateAudioFile,
// };

// src/services/whisperService.js
// const fs = require("fs");
// const path = require("path");
// const { InferenceClient } = require("@huggingface/inference");

// /**
//  * Uses @huggingface/inference InferenceClient.automaticSpeechRecognition
//  * Exports:
//  *  - transcribeAudio(audioFilePath, opts) => Promise<string>
//  *  - validateAudioFile(audioFilePath) => boolean
//  *
//  * Env:
//  *  - HF_API_KEY or HF_TOKEN (required)
//  *  - HF_WHISPER_MODEL (optional, default: "openai/whisper-large-v3")
//  *  - HF_PROVIDER (optional, e.g., "fal-ai")
//  */

// const HF_KEY = process.env.HF_API_KEY || process.env.HF_TOKEN;
// if (!HF_KEY) {
//   // do not throw at module load to keep testability, but warn
//   console.warn(
//     "Warning: HF_API_KEY / HF_TOKEN is not set. Transcription calls will fail until set."
//   );
// }

// const client = new InferenceClient({ apiKey: HF_KEY });

// const DEFAULT_MODEL = process.env.HF_WHISPER_MODEL || "openai/whisper-large-v3";

// /**
//  * Validate the audio file (exists, extension, size)
//  * Throws on failure.
//  */
// const validateAudioFile = (audioFilePath) => {
//   if (!fs.existsSync(audioFilePath)) throw new Error("Audio file not found");
//   const stats = fs.statSync(audioFilePath);
//   if (!stats.isFile()) throw new Error("Path is not a file");

//   // max size configurable via MAX_FILE_SIZE in bytes; default 25MB
//   const max = parseInt(process.env.MAX_FILE_SIZE || 25 * 1024 * 1024, 10);
//   if (stats.size > max)
//     throw new Error("Audio file exceeds configured max size");

//   const allowedExt = [
//     ".mp3",
//     ".mp4",
//     ".mpeg",
//     ".mpga",
//     ".m4a",
//     ".wav",
//     ".webm",
//     ".flac",
//     ".ogg",
//   ];
//   const ext = path.extname(audioFilePath).toLowerCase();
//   if (!allowedExt.includes(ext)) {
//     throw new Error(`Invalid audio format. Allowed: ${allowedExt.join(", ")}`);
//   }

//   return true;
// };

// /**
//  * Transcribe audio using HF InferenceClient automaticSpeechRecognition.
//  * - audioFilePath: local path to audio file
//  * - opts: { model, provider } optional
//  */
// const transcribeAudio = async (audioFilePath, opts = {}) => {
//   try {
//     // Basic pre-checks
//     validateAudioFile(audioFilePath);

//     if (!HF_KEY)
//       throw new Error("Missing Hugging Face API key (HF_API_KEY or HF_TOKEN)");

//     const model = opts.model || process.env.HF_WHISPER_MODEL || DEFAULT_MODEL;
//     const provider = opts.provider || process.env.HF_PROVIDER; // e.g., "fal-ai"

//     // Read audio file into buffer (Buffer works with the client)
//     const data = fs.readFileSync(audioFilePath);

//     // Call the HF SDK method
//     // Note: provider is optional (only include if set)
//     const params = {
//       data,
//       model,
//     };
//     if (provider) params.provider = provider;

//     // Timeout / network errors will throw; consider adding retries in production
//     const output = await client.automaticSpeechRecognition(params);

//     // Typical output shapes: { text: "..." } or a string.
//     if (!output) throw new Error("Empty response from HF inference client");

//     // Prefer text property if present
//     if (typeof output === "object" && typeof output.text === "string") {
//       return output.text;
//     }

//     if (typeof output === "string") {
//       return output;
//     }

//     // Some clients return {results: [{text: "..."}]} or similar - attempt heuristics:
//     if (Array.isArray(output?.results) && output.results[0]?.text) {
//       return output.results.map((r) => r.text).join(" ");
//     }
//     if (
//       output?.results?.length &&
//       output.results[0]?.alternatives?.[0]?.transcript
//     ) {
//       return output.results.map((r) => r.alternatives[0].transcript).join(" ");
//     }

//     // Fallback: stringify and return if it contains readable text
//     const asString = JSON.stringify(output);
//     const matched = asString.match(/"text"\s*:\s*"([^"]+)"/);
//     if (matched) return matched[1];

//     throw new Error("Unexpected HF response structure: " + asString);
//   } catch (err) {
//     // Map some common errors to clearer messages
//     const message = err?.message || String(err);
//     if (/401|Unauthorized|invalid token/i.test(message)) {
//       throw new Error("Invalid Hugging Face API key (401)");
//     }
//     if (/429|RateLimit|rate limit/i.test(message)) {
//       throw new Error("Hugging Face rate limit exceeded (429)");
//     }
//     if (/413|Payload Too Large|Request body/i.test(message)) {
//       throw new Error("Audio file too large (HTTP 413)");
//     }
//     // Re-throw with context
//     throw new Error(`Transcription failed: ${message}`);
//   }
// };

// module.exports = {
//   transcribeAudio,
//   validateAudioFile,
// };
