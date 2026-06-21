import { Router } from "express";
import {
  getDoctors,
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  reportEmergency,
  upsertDoctor,
} from "../controllers/medicalController.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { requireAdmin, requireUserOrAdmin } from "../middleware/authorize.js";

const router = Router();

router.get("/doctors", getDoctors);
router.get("/appointments", authenticate, requireUserOrAdmin, getAppointments);
router.post("/appointments", optionalAuth, createAppointment);
router.patch("/appointments/:id", authenticate, requireAdmin, updateAppointmentStatus);
router.post("/emergencies", optionalAuth, reportEmergency);
router.post("/doctors", authenticate, requireAdmin, upsertDoctor);

export default router;
