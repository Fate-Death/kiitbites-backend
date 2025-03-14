const express = require("express");
const { signup, verifyOtp, login, forgotPassword, resetPassword, googleAuth, googleSignup } = require("../controllers/authController");
const router = express.Router();

router.post("/signup", signup);
router.post("/verifyotp", verifyOtp);
router.post("/login", login);
router.post("/forgotpassword", forgotPassword);
router.post("/resetpassword", resetPassword);
router.post("/googleAuth", googleAuth);
router.post("/googleSignup", googleSignup);

module.exports = router;
