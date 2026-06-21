import { Router } from "express";
import {
  getFinanceOptions,
  getAssistanceRequests,
  submitAssistanceRequest,
  updateAssistanceRequest,
  getPayoutBatches,
  createPayoutBatch,
  updatePayoutBatch,
} from "../controllers/financialController.js";
import { authenticate } from "../middleware/auth.js";
import { requireAdmin, requireUserOrAdmin } from "../middleware/authorize.js";

const router = Router();

router.get("/info", getFinanceOptions);
router.get("/requests", authenticate, requireUserOrAdmin, getAssistanceRequests);
router.post("/requests", authenticate, requireUserOrAdmin, submitAssistanceRequest);
router.patch("/requests/:id", authenticate, requireAdmin, updateAssistanceRequest);
router.get("/payouts", authenticate, requireAdmin, getPayoutBatches);
router.post("/payouts", authenticate, requireAdmin, createPayoutBatch);
router.patch("/payouts/:id", authenticate, requireAdmin, updatePayoutBatch);

export default router;
