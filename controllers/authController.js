const User = require("../models/User");
const Otp = require("../models/Otp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendOtpEmail = require("../utils/sendOtp");

// Utility: Generate OTP
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// Utility: Hash Password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// **1. User Signup**
exports.signup = async (req, res) => {
  try {
    console.log("🔵 Signup Request Received:", req.body);

    const { fullName, email, phone, password, gender } = req.body;
    let existingUser = await User.findOne({ $or: [{ email }, { phone }] });

    if (existingUser) {
      console.log("⚠️ User already exists:", email);
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await hashPassword(password);
    console.log("🔒 Password hashed successfully");

    const newUser = new User({ fullName, email, phone, password: hashedPassword, gender });
    await newUser.save();
    console.log("✅ User saved to database:", email);

    // Generate OTP & Send Email
    const otp = generateOtp();
    console.log("🔢 OTP Generated:", otp);

    await new Otp({ email, otp }).save();
    console.log("✅ OTP saved to database");

    await sendOtpEmail(email, otp);
    console.log("📧 OTP sent to email:", email);

    res.status(201).json({ message: "User registered, OTP sent for verification" });
  } catch (error) {
    console.error("❌ Signup Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// **2. OTP Verification**
exports.verifyOtp = async (req, res) => {
  try {
    console.log("🔵 OTP Verification Request:", req.body);

    const { email, otp } = req.body;
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) {
      console.log("⚠️ Invalid or expired OTP:", otp);
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    await User.findOneAndUpdate({ email }, { isVerified: true });
    console.log("✅ User verified:", email);

    await Otp.deleteOne({ email });
    console.log("🗑️ OTP deleted from database");

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("❌ OTP Verification Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// **3. Login**
exports.login = async (req, res) => {
  try {
    console.log("🔵 Login Request:", req.body);

    const { identifier, password } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      // Generate new OTP
      const otp = generateOtp();
      await new Otp({ email: user.email, otp, createdAt: Date.now() }).save();

      // Send OTP email
      await sendOtpEmail(user.email, otp);

      // Redirect user to OTP verification
      return res.status(400).json({
        message: "User not verified. OTP sent to email.",
        redirectTo: `/otpverification?email=${user.email}&from=login`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id, access: user.access }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// **4. Forgot Password**
exports.forgotPassword = async (req, res) => {
  try {
    console.log("🔵 Forgot Password Request:", req.body);

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      console.log("⚠️ User not found:", email);
      return res.status(400).json({ message: "User not found" });
    }

    const otp = generateOtp();
    console.log("🔢 OTP Generated:", otp);

    await new Otp({ email, otp }).save();
    console.log("✅ OTP saved to database");

    await sendOtpEmail(email, otp);
    console.log("📧 OTP sent to email:", email);

    res.json({ message: "OTP sent for password reset" });
  } catch (error) {
    console.error("❌ Forgot Password Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// **5. Reset Password**
exports.resetPassword = async (req, res) => {
  try {
    console.log("🔵 Reset Password Request:", req.body);

    const { email, password } = req.body;
    const hashedPassword = await hashPassword(password);
    console.log("🔒 Password hashed successfully");

    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    console.log("✅ Password updated for:", email);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("❌ Reset Password Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// **6. Google Login**
exports.googleAuth = async (req, res) => {
  try {
    console.log("🔵 Google Login Request:", req.body);

    const { email } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
      console.log("⚠️ User not found for Google login:", email);
      return res.status(400).json({ message: "User does not exist, sign up first" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    console.log("✅ Google login successful:", email);

    res.json({ message: "Google login successful", token });
  } catch (error) {
    console.error("❌ Google Login Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// **7. Google Signup**
exports.googleSignup = async (req, res) => {
  try {
    console.log("🔵 Google Signup Request:", req.body);

    const { email, googleId, fullName } = req.body;

    let existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("⚠️ User already exists:", email);
      return res.status(400).json({ message: "User already exists. Please log in." });
    }

    const newUser = new User({
      fullName,
      email,
      phone: "", // No phone number required for Google signup
      password: "", // Google users won't have a password
      gender: "", // Ask later or keep it optional
      googleId,
      isVerified: true, // No OTP needed for Google Signup
    });

    await newUser.save();
    console.log("✅ Google user saved to database:", email);

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ message: "Google signup successful", token });
  } catch (error) {
    console.error("❌ Google Signup Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// **8. Logout**
exports.logout = async (req, res) => {
  try {
    console.log("🔵 Logout Request:", req.user.userId);

    // If using a token blacklist, store the token as invalidated
    // const token = req.headers.authorization.split(" ")[1];
    // await TokenBlacklist.create({ token });  // Implement a blacklist model if needed

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("❌ Logout Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
