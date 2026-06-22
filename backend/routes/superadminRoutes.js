import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/authorize.js";
import {
  getSuperAdminStats,
  getSuperAdminAccounts,
  getSuperAdminAccount,
  updateSuperAdminAccount,
  archiveAccount,
  restoreAccount,
  getAuditLogs,
  getArchive,
  getSuperAdminSettings,
  updateSuperAdminSettings,
  createAdminAccount,
} from "../controllers/superadminController.js";

const router = Router();

// Middleware: Require superadmin role for all superadmin endpoints
router.use(authenticate, requireRole("superadmin"));

// Dashboard stats
router.get("/stats", getSuperAdminStats);

// Accounts management
router.get("/accounts", getSuperAdminAccounts);
router.post("/accounts", createAdminAccount);
router.get("/accounts/:accountId", getSuperAdminAccount);
router.patch("/accounts/:accountId", updateSuperAdminAccount);
router.post("/accounts/:accountId/archive", archiveAccount);
router.post("/accounts/:archiveId/restore", restoreAccount);

// Audit logs
router.get("/audit-logs", getAuditLogs);

// Archive/Trash
router.get("/archive", getArchive);

// Settings
router.get("/settings", getSuperAdminSettings);
router.patch("/settings", updateSuperAdminSettings);

export default router;
