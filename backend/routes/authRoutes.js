import { Router } from "express";
import {
  registerUser,
  registerAdmin,
  loginUser,
  forgotPassword,
  getProfile,
  updateProfile,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { requireUserAdminSuper } from "../middleware/authorize.js";

const router = Router();

router.post("/register", registerUser);
router.post("/register/admin", registerAdmin);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.get("/profile", authenticate, requireUserAdminSuper, getProfile);
router.patch("/profile", authenticate, requireUserAdminSuper, updateProfile);

export default router;
