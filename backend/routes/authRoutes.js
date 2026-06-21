import { Router } from "express";
import {
  registerUser,
  registerAdmin,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getProfile,
  updateProfile,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { requireUserOrAdmin } from "../middleware/authorize.js";

const router = Router();

router.post("/register", registerUser);
router.post("/register/admin", registerAdmin);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.get("/profile", authenticate, requireUserOrAdmin, getProfile);
router.patch("/profile", authenticate, requireUserOrAdmin, updateProfile);

export default router;
