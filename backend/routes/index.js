import { Router } from "express";
import authRoutes from "./authRoutes.js";
import medicalRoutes from "./medicalRoutes.js";
import financialRoutes from "./financialRoutes.js";
import governmentRoutes from "./governmentRoutes.js";
import generalRoutes from "./generalRoutes.js";
import { isFirebaseReady } from "../config/firebase.js";
import { getDoctors, getAppointments, createAppointment } from "../controllers/medicalController.js";
import {
  getEvents,
  getAnnouncements,
  createAnnouncement,
  getAbout,
  globalSearch,
  submitContact,
  getDashboardStats,
} from "../controllers/socialController.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { requireAdmin, requireUserOrAdmin } from "../middleware/authorize.js";

const router = Router();

router.get("/status", (req, res) => {
  res.json({
    status: "ok",
    service: "SenEtizen Backend",
    version: "2.0.0",
    firebase: isFirebaseReady ? "connected" : "fallback-local",
  });
});

router.use("/auth", authRoutes);
router.use("/medical", medicalRoutes);
router.use("/financial", financialRoutes);
router.use("/government", governmentRoutes);
router.use("/social", generalRoutes);

// Legacy aliases (v1 frontend paths)
router.get("/about", getAbout);
router.get("/doctors", getDoctors);
router.get("/events", getEvents);
router.get("/announcements", getAnnouncements);
router.get("/search", globalSearch);
router.post("/contacts", optionalAuth, submitContact);
router.get("/appointments", authenticate, requireUserOrAdmin, getAppointments);
router.post("/appointments", optionalAuth, createAppointment);

export default router;
