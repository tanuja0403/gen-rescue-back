const express = require("express");
const router = express.Router();
const {
  createVoiceSOS,
  createTextSOS,
  getAllSOS,
  getSOSById,
  updateSOSStatus,
  getSOSStats,
} = require("../controllers/sosController");
const { uploadAudio, uploadPhoto } = require("../middleware/upload");

// SOS Creation Routes
router.post("/voice", uploadAudio, createVoiceSOS);
router.post("/text", createTextSOS);

// SOS Retrieval Routes (for rescuer dashboard)
router.get("/", getAllSOS);
router.get("/stats", getSOSStats);
router.get("/:id", getSOSById);

// SOS Update Routes (for rescuer actions)
router.patch("/:id", updateSOSStatus);

module.exports = router;
