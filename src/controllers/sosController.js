const SOS = require("../models/SOS");
const {
  transcribeAudio,
  validateAudioFile,
} = require("../services/whisperService");
const { analyzeSOSContent, analyzeTextSOS } = require("../services/gptService");
const {
  validateAIAnalysis,
  validateSOSData,
} = require("../services/validationService");
const fs = require("fs");
const path = require("path");

/**
 * Create new voice SOS
 * POST /api/sos/voice
 */
const createVoiceSOS = async (req, res) => {
  try {
    console.log("📥 Received voice SOS");

    // Parse request body
    const { sessionId, location } = req.body;
    const audioFile = req.file;

    // Validate required fields
    if (!audioFile) {
      return res.status(400).json({
        success: false,
        error: "Audio file is required",
      });
    }

    // Validate SOS data
    const validation = validateSOSData({
      sessionId,
      sosType: "voice",
      location: JSON.parse(location),
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    // Create initial SOS record
    const sos = await SOS.create({
      sessionId,
      sosType: "voice",
      location: JSON.parse(location),
      originalData: {
        voiceFileUrl: audioFile.path,
      },
      status: "processing",
      receivedAt: new Date(),
    });

    // Process in background (don't wait)
    processVoiceSOS(sos._id, audioFile.path).catch((err) => {
      console.error("Background processing error:", err);
    });

    // Immediate response to survivor
    res.status(201).json({
      success: true,
      message: "SOS received and being processed",
      sosId: sos._id,
      status: "processing",
    });
  } catch (error) {
    console.error("Voice SOS creation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process voice SOS",
    });
  }
};

/**
 * Background processing for voice SOS
 */
const processVoiceSOS = async (sosId, audioFilePath) => {
  try {
    // Step 1: Transcribe audio
    const transcript = await transcribeAudio(audioFilePath);

    await SOS.findByIdAndUpdate(sosId, {
      transcript,
      status: "processing",
    });

    // Step 2: AI analysis
    const sos = await SOS.findById(sosId);
    const aiAnalysis = await analyzeSOSContent(transcript, {
      receivedAt: sos.receivedAt,
      location: sos.location,
    });

    // Step 3: Validation
    const validationResult = validateAIAnalysis(aiAnalysis, transcript);

    // Step 4: Update with final analysis
    await SOS.findByIdAndUpdate(sosId, {
      aiAnalysis: {
        ...aiAnalysis,
        urgency: validationResult.adjustedUrgency,
      },
      validationFlags: {
        hasKeywords: validationResult.hasKeywords,
        meetsThreshold: validationResult.meetsThreshold,
        manualReview: validationResult.manualReview,
      },
      status: "processed",
      processedAt: new Date(),
    });

    console.log(`✅ SOS ${sosId} processed successfully`);
  } catch (error) {
    console.error(`❌ Processing failed for SOS ${sosId}:`, error);

    await SOS.findByIdAndUpdate(sosId, {
      status: "failed",
      processingErrors: [error.message],
    });
  }
};

/**
 * Create new text SOS
 * POST /api/sos/text
 */
const createTextSOS = async (req, res) => {
  try {
    console.log("📥 Received text SOS");

    const { sessionId, location, message } = req.body;

    // Validate
    const validation = validateSOSData({
      sessionId,
      sosType: "text",
      location,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Message text is required",
      });
    }

    // Create SOS
    const sos = await SOS.create({
      sessionId,
      sosType: "text",
      location,
      originalData: {
        textMessage: message,
      },
      transcript: message, // For text, transcript is the message itself
      status: "processing",
      receivedAt: new Date(),
    });

    // Process AI analysis
    const aiAnalysis = await analyzeTextSOS(message, {
      receivedAt: sos.receivedAt,
      location,
    });

    const validationResult = validateAIAnalysis(aiAnalysis, message);

    // Update with analysis
    await SOS.findByIdAndUpdate(sos._id, {
      aiAnalysis: {
        ...aiAnalysis,
        urgency: validationResult.adjustedUrgency,
      },
      validationFlags: {
        hasKeywords: validationResult.hasKeywords,
        meetsThreshold: validationResult.meetsThreshold,
        manualReview: validationResult.manualReview,
      },
      status: "processed",
      processedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Text SOS processed",
      sosId: sos._id,
      status: "processed",
    });
  } catch (error) {
    console.error("Text SOS creation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process text SOS",
    });
  }
};

/**
 * Get all SOS cases (for rescuer dashboard)
 * GET /api/sos
 */
const getAllSOS = async (req, res) => {
  try {
    const { status, urgency, limit = 100, skip = 0 } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (urgency) filter["aiAnalysis.urgency"] = urgency;

    const sosCases = await SOS.find(filter)
      .sort({ "aiAnalysis.urgency": -1, receivedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select("-__v");

    const total = await SOS.countDocuments(filter);

    res.json({
      success: true,
      count: sosCases.length,
      total,
      data: sosCases,
    });
  } catch (error) {
    console.error("Get SOS error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch SOS cases",
    });
  }
};

/**
 * Get single SOS by ID
 * GET /api/sos/:id
 */
const getSOSById = async (req, res) => {
  try {
    const sos = await SOS.findById(req.params.id);

    if (!sos) {
      return res.status(404).json({
        success: false,
        error: "SOS not found",
      });
    }

    res.json({
      success: true,
      data: sos,
    });
  } catch (error) {
    console.error("Get SOS by ID error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch SOS",
    });
  }
};

/**
 * Update SOS status (for rescuer actions)
 * PATCH /api/sos/:id
 */
const updateSOSStatus = async (req, res) => {
  try {
    const { status, assignedTo, resolutionNotes } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (assignedTo) {
      updateData.assignedTo = assignedTo;
      updateData.assignedAt = new Date();
    }
    if (resolutionNotes) {
      updateData.resolutionNotes = resolutionNotes;
      if (status === "resolved") {
        updateData.resolvedAt = new Date();
      }
    }

    const sos = await SOS.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!sos) {
      return res.status(404).json({
        success: false,
        error: "SOS not found",
      });
    }

    res.json({
      success: true,
      message: "SOS updated successfully",
      data: sos,
    });
  } catch (error) {
    console.error("Update SOS error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update SOS",
    });
  }
};

/**
 * Get SOS statistics
 * GET /api/sos/stats
 */
const getSOSStats = async (req, res) => {
  try {
    const stats = await SOS.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          critical: {
            $sum: {
              $cond: [{ $eq: ["$aiAnalysis.urgency", "CRITICAL"] }, 1, 0],
            },
          },
          high: {
            $sum: { $cond: [{ $eq: ["$aiAnalysis.urgency", "HIGH"] }, 1, 0] },
          },
          medium: {
            $sum: { $cond: [{ $eq: ["$aiAnalysis.urgency", "MEDIUM"] }, 1, 0] },
          },
          low: {
            $sum: { $cond: [{ $eq: ["$aiAnalysis.urgency", "LOW"] }, 1, 0] },
          },
          processed: {
            $sum: { $cond: [{ $eq: ["$status", "processed"] }, 1, 0] },
          },
          assigned: {
            $sum: { $cond: [{ $eq: ["$status", "assigned"] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0] || {},
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics",
    });
  }
};

module.exports = {
  createVoiceSOS,
  createTextSOS,
  getAllSOS,
  getSOSById,
  updateSOSStatus,
  getSOSStats,
};
