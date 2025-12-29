const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: sessionId_timestamp_originalname
    const sessionId = req.body.sessionId || "unknown";
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${sessionId}_${timestamp}${ext}`;
    cb(null, filename);
  },
});

// File filter for audio files
const audioFileFilter = (req, file, cb) => {
  const allowedMimes = [
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/webm",
    "audio/x-m4a",
    "audio/m4a",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file type. Allowed: ${allowedMimes.join(", ")}`),
      false
    );
  }
};

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid image type. Allowed: ${allowedMimes.join(", ")}`),
      false
    );
  }
};

// Audio upload configuration
const uploadAudio = multer({
  storage: storage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
}).single("audio");

// Photo upload configuration
const uploadPhoto = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
}).single("photo");

// Wrapper to handle multer errors
const handleUpload = (uploadFunction) => {
  return (req, res, next) => {
    uploadFunction(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "File size exceeds limit (10MB)",
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`,
        });
      } else if (err) {
        // Other errors
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      }
      next();
    });
  };
};

module.exports = {
  uploadAudio: handleUpload(uploadAudio),
  uploadPhoto: handleUpload(uploadPhoto),
};
