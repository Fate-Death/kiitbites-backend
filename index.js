require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");

const app = express();

// ✅ Load environment variables
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const MONGO_URL = process.env.MONGO_URL;
const PORT = process.env.PORT || 5001;

// ✅ Fix CORS issues with dynamic frontend URL
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // Allow only specific frontend
    credentials: true, // Allow cookies & authentication headers
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// ✅ Check if MONGO_URL is set
if (!MONGO_URL) {
  console.error("❌ MONGO_URL is missing in .env file");
  process.exit(1);
}

// ✅ Connect to MongoDB
mongoose
  .connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

app.use("/api/auth", authRoutes);

// ✅ Global error handling for debugging
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});
app.enable("trust proxy"); // Only if using a proxy like Nginx

app.use((req, res, next) => {
  if (req.secure) {
    return res.redirect("http://" + req.headers.host + req.url);
  }
  next();
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}, allowing frontend from ${FRONTEND_URL}`));
console.log("🚀 Attempting to connect to MongoDB...");
console.log("MONGO_URL:", process.env.MONGO_URL);
console.log(PORT);