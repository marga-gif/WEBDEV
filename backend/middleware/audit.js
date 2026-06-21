import { addRecord } from "../services/firestoreService.js";

export async function logAudit(req, action, details = {}) {
  try {
    const isAdmin = req.user?.role === "admin";
    const collection = isAdmin ? "adminAuditLogs" : "auditLogs";
    await addRecord(collection, {
      action,
      actorUid: req.user?.uid || "anonymous",
      actorEmail: req.user?.email || "",
      actorRole: req.user?.role || (isAdmin ? "admin" : "guest"),
      path: req.originalUrl,
      method: req.method,
      details,
      ip: req.ip,
      timestamp: new Date(),
    });
  } catch {
    // Audit logging should not block main requests.
  }
}

export async function logAdminAudit(req, action, details = {}) {
  try {
    await addRecord("adminAuditLogs", {
      action,
      actorUid: req.user?.uid || "anonymous",
      actorEmail: req.user?.email || "",
      actorRole: req.user?.role || "admin",
      path: req.originalUrl,
      method: req.method,
      details,
      ip: req.ip,
      timestamp: new Date(),
    });
  } catch {
    // Audit logging should not block main requests.
  }
}

export async function logAdminAuthAudit(email, action, details = {}) {
  try {
    await addRecord("adminAuthAuditLogs", {
      action,
      actorEmail: email,
      actorRole: "admin",
      details,
      timestamp: new Date(),
    });
  } catch {
    // Audit logging should not block main requests.
  }
}
