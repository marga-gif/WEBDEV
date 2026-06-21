import { Router } from "express";
import {
  getEvents,
  getAnnouncements,
  createEvent,
  updateEvent,
  createAnnouncement,
  registerForEvent,
  getEventRegistrations,
  submitContact,
  getAbout,
  globalSearch,
  getDashboardStats,
  getAuditLogs,
  getCitizens,
  updateCitizenStatus,
} from "../controllers/socialController.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { requireAdmin, requireUserOrAdmin } from "../middleware/authorize.js";

const router = Router();

router.get("/events", getEvents);
router.get("/announcements", getAnnouncements);
router.post("/announcements", authenticate, requireAdmin, createAnnouncement);
router.get("/about", getAbout);
router.get("/search", globalSearch);
router.post("/contacts", optionalAuth, submitContact);
router.post("/events", authenticate, requireAdmin, createEvent);
router.patch("/events/:id", authenticate, requireAdmin, updateEvent);
router.post("/registrations", authenticate, requireUserOrAdmin, registerForEvent);
router.get("/registrations", authenticate, requireUserOrAdmin, getEventRegistrations);

router.get("/dashboard", authenticate, requireAdmin, getDashboardStats);
router.get("/audit-logs", authenticate, requireAdmin, getAuditLogs);
router.get("/citizens", authenticate, requireAdmin, getCitizens);
router.patch("/citizens/:id", authenticate, requireAdmin, updateCitizenStatus);

export default router;
