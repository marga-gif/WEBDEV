import {
  getCollection,
  addRecord,
  updateRecord,
  getRecordById,
} from "../services/firestoreService.js";
import { logAudit } from "../middleware/audit.js";

const FINANCE_INFO = {
  pension: {
    title: "Pension Information",
    items: [
      "SSS Pensioners: Ensure your registered bank account is updated.",
      "GSIS Pensioners: Pensions are released through e-Crediting every 8th of the month.",
      "Complete your Annual Confirmation of Pensioners (ACOP) to avoid suspension.",
    ],
  },
  benefits: {
    title: "Government Benefits",
    items: [
      "Social Pension: Indigent senior citizens may receive monthly assistance from DSWD.",
      "PhilHealth Coverage: Senior citizens are covered under RA 10645.",
      "Death Benefit: Financial assistance may be available for bereaved families.",
    ],
  },
  discounts: {
    title: "Senior Discounts",
    items: [
      "20% discount and VAT exemption on medicines and medical services (RA 9994).",
      "5% special discount on basic necessities up to weekly limits.",
      "Cinema and transport privileges in participating establishments.",
    ],
  },
  assistance: {
    title: "Financial Assistance",
    items: [
      "DSWD AICS for medical, burial, and transportation aid.",
      "LGU cash gifts and local senior citizen benefits.",
      "Contact OSCA for city-specific financial aid programs.",
    ],
  },
};

export async function getFinanceOptions(req, res) {
  res.json(FINANCE_INFO);
}

function normalizeFinancialRequest(item) {
  return {
    id: item.id || item.requestId || null,
    seniorId: item.seniorId || item.requesterSeniorId || item.userId || "SC-N/A",
    name: item.requesterName || item.fullName || item.requesterEmail || "Unknown Citizen",
    purok: item.purok || item.requesterPurok || item.address || "",
    amount: Number(item.amount) || 0,
    status: item.status || "Pending Review",
    requestType: item.requestType || item.category || "Financial Assistance",
    reason: item.reason || item.supportingDetails || "",
    userId: item.userId || "",
    createdAt: item.createdAt || item.createdDate || "",
  };
}

export async function getAssistanceRequests(req, res) {
  let requests = await getCollection("financialRequests");

  if (req.user.role === "user") {
    requests = requests.filter((item) => item.userId === req.user.uid);
  }

  const normalized = requests
    .map(normalizeFinancialRequest)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  res.json(normalized);
}

export async function submitAssistanceRequest(req, res) {
  const { requestType, amount, reason, supportingDetails } = req.body;

  if (!requestType || !reason) {
    return res.status(400).json({ error: "Request type and reason are required." });
  }

  const request = await addRecord("financialRequests", {
    userId: req.user.uid,
    requesterName: req.user.fullName,
    requesterEmail: req.user.email,
    seniorId: req.user.profile?.seniorId || "SC-N/A",
    purok: req.user.profile?.purok || "",
    requestType,
    amount: Number(amount) || 0,
    reason,
    supportingDetails: supportingDetails || "",
    status: "Pending Review",
    category: "financial",
  });

  await logAudit(req, "FINANCIAL_REQUEST_SUBMITTED", { requestId: request.id });
  res.status(201).json(request);
}

export async function updateAssistanceRequest(req, res) {
  const { id } = req.params;
  const { status, adminNotes } = req.body;

  const allowed = ["Pending Review", "Approved", "Rejected", "Disbursed"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const existing = await getRecordById("financialRequests", id);
  if (!existing) {
    return res.status(404).json({ error: "Request not found." });
  }

  const updated = await updateRecord("financialRequests", id, { status, adminNotes: adminNotes || "" });
  await logAudit(req, "FINANCIAL_REQUEST_UPDATED", { requestId: id, status });
  res.json(updated);
}

export async function getPayoutBatches(req, res) {
  const batches = await getCollection("payoutBatches");
  res.json(batches);
}

export async function createPayoutBatch(req, res) {
  const { title, payoutDate, roster, batchId } = req.body;

  if (!title || !payoutDate) {
    return res.status(400).json({ error: "Title and payout date are required." });
  }

  const batch = await addRecord("payoutBatches", {
    batchId: batchId || `BATCH-${Date.now()}`,
    title,
    payoutDate,
    status: "Upcoming",
    roster: roster || [],
    category: "financial",
  });

  await logAudit(req, "PAYOUT_BATCH_CREATED", { batchId: batch.id });
  res.status(201).json(batch);
}

export async function updatePayoutBatch(req, res) {
  const { id } = req.params;
  const changes = req.body;

  const updated = await updateRecord("payoutBatches", id, changes);
  if (!updated) {
    return res.status(404).json({ error: "Payout batch not found." });
  }

  await logAudit(req, "PAYOUT_BATCH_UPDATED", { batchId: id });
  res.json(updated);
}
