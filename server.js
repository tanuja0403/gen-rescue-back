require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/database");
const sosRoutes = require("./src/routes/sos");
const { errorHandler, notFound } = require("./src/middleware/errorHandler");

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "GEN-Rescue Backend is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/sos", sosRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     GEN-RESCUE BACKEND SERVER          ║
║                                        ║
║  Status: ✅ Running                    ║
║  Port: ${PORT}                           ║
║  Environment: ${process.env.NODE_ENV || "development"}              ║
║  API: http://localhost:${PORT}/api       ║
╚════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  // Close server & exit process
  process.exit(1);
});
