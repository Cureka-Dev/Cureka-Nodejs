import { Router } from "express";
import { sendOtp, verifyOTP, loginEmail,updateAccountDetails,getUserDetails, signup, login } from "../controllers/customers.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";
const router = Router();

// Send OTP - Public Route
router.post("/send-otp", sendOtp);

// Verify OTP - Public Route
router.post("/verify-otp", verifyOTP);

// User Login - Public Route
router.post("/user-login", loginEmail);
router.post("/signup", signup);
router.post("/login", login);
// User Update 
router.post("/updateAccountDetails",jwtMiddleware([userType.USER]), updateAccountDetails);
router.get("/getUserDetails",jwtMiddleware([userType.USER]), getUserDetails);
// Example of a Protected Route (requires valid JWT token)
router.get("/protected", jwtMiddleware(), (req, res) => {
  res.status(200).json({ message: "Access granted to protected route." });
});

export default router;
