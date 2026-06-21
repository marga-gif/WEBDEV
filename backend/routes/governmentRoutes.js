import { Router } from "express";
import {
  getDocumentCategories,
  getDocumentRequests,
  submitDocumentRequest,
  updateDocumentRequest,
  searchDocuments,
} from "../controllers/governmentController.js";
import { authenticate } from "../middleware/auth.js";
import { requireAdmin, requireUserOrAdmin } from "../middleware/authorize.js";

const router = Router();

router.get("/categories", getDocumentCategories);
router.get("/search", searchDocuments);
router.get("/requests", authenticate, requireUserOrAdmin, getDocumentRequests);
router.post("/requests", authenticate, requireUserOrAdmin, submitDocumentRequest);
router.patch("/requests/:id", authenticate, requireAdmin, updateDocumentRequest);

export default router;
