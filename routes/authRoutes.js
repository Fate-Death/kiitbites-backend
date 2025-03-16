const express = require("express");
const { signup, verifyOtp, login, forgotPassword, resetPassword, googleAuth, googleSignup, logout } = require("../controllers/authController");
const router = express.Router();

router.post("/signup", signup);
router.post("/otpverification", verifyOtp);
router.post("/login", login);
router.post("/forgotpassword", forgotPassword);
router.post("/resetpassword", resetPassword);
router.post("/googleAuth", googleAuth);
router.post("/googleSignup", googleSignup);
router.post("/logout", logout);

module.exports = router;
