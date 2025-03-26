require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const foodRoutes = require("./routes/foodRoutes");
const contactRoute = require("./routes/contactRoute")
const connectDB = require("./config/db");
const teamRoutes = require("./routes/teamRoutes");

const app = express();
connectDB();


// ✅ Load environment variables
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const MONGO_URL = process.env.MONGO_URL;
const PORT = process.env.PORT || 5001;

// ✅ Fix CORS issues
app.use(
  cors({
    origin: FRONTEND_URL, // Only allow frontend URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ✅ Ensure MONGO_URL exists
if (!MONGO_URL) {
  console.error("❌ MONGO_URL is missing in .env file");
  process.exit(1);
}

app.use("/api/auth", authRoutes);
app.use("/api", foodRoutes);
app.use("/contact", contactRoute)
app.use("/team", teamRoutes);

// ✅ Global error handling
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

// ✅ Redirect HTTP to HTTPS in Production
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect("https://" + req.headers.host + req.url);
    }
    next();
  });
}

// ✅ Start Server
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}, allowing frontend from ${FRONTEND_URL}`)
);
