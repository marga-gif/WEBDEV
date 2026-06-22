import {
  getCollection,
  getRecordById,
  addRecord,
  updateRecord,
  deleteRecord,
  queryCollection,
} from "../services/firestoreService.js";
import { logAdminAudit } from "../middleware/audit.js";

// Get dashboard statistics
export async function getSuperAdminStats(req, res) {
  try {
    const users = await getCollection("users");
    const adminAuditLogs = await getCollection("adminAuditLogs");
    const adminAuthAuditLogs = await getCollection("adminAuthAuditLogs");
    const superAdminAuthAuditLogs = await getCollection("superadminAuthAuditLogs");
    const financialRequests = await getCollection("financialRequests");
    const payoutBatches = await getCollection("payoutBatches");

    const totalUsers = users.filter((u) => u.role === "user").length;
    const totalAdmins = users.filter((u) => u.role === "admin").length;
    const activeUsers = users.filter(
      (u) => u.status !== "disabled" && u.role === "user"
    ).length;
    const archivedUsers = users.filter((u) => u.status === "archived").length;

    const pendingFinancialRequests = financialRequests.filter(
      (f) => f.status === "pending"
    ).length;
    const approvedFinancialRequests = financialRequests.filter(
      (f) => f.status === "approved"
    ).length;
    const rejectedFinancialRequests = financialRequests.filter(
      (f) => f.status === "rejected"
    ).length;
    const disbursedFinancialRequests = financialRequests.filter(
      (f) => f.status === "disbursed"
    ).length;

    const upcomingPayoutBatches = payoutBatches.filter(
      (b) => b.status === "pending" || b.status === "scheduled"
    ).length;

    // Recent activity from auth audit logs
    const recentActivity = [...adminAuthAuditLogs, ...superAdminAuthAuditLogs]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 12);

    return res.json({
      metrics: {
        totalUsers,
        activeUsers,
        adminAccounts: totalAdmins,
        archivedAccounts: archivedUsers,
        pendingFinancialRequests,
        approvedFinancialRequests,
        rejectedFinancialRequests,
        disbursedFinancialRequests,
        upcomingPayoutBatches,
        totalPayoutBatches: payoutBatches.length,
      },
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching superadmin stats:", error);
    res.status(500).json({ error: "Failed to fetch stats." });
  }
}

// Get all accounts (users and admins) with filtering
export async function getSuperAdminAccounts(req, res) {
  try {
    const { role, status, q } = req.query;
    let accounts = await getCollection("users");

    // Filter by role
    if (role && role !== "all") {
      accounts = accounts.filter((a) => a.role === role);
    }

    // Filter by status
    if (status && status !== "all") {
      accounts = accounts.filter((a) => (a.status || "active") === status);
    }

    // Search by name or email
    if (q) {
      const lowerQ = q.toLowerCase();
      accounts = accounts.filter(
        (a) =>
          (a.fullName || "").toLowerCase().includes(lowerQ) ||
          (a.email || "").toLowerCase().includes(lowerQ)
      );
    }

    // Return only necessary fields
    const filtered = accounts.map((a) => ({
      id: a.id,
      fullName: a.fullName || a.email,
      email: a.email,
      role: a.role || "user",
      status: a.status || "active",
      permissions: a.permissions || [],
      createdAt: a.createdAt,
    }));

    res.json(filtered);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({ error: "Failed to fetch accounts." });
  }
}

// Get single account details
export async function getSuperAdminAccount(req, res) {
  try {
    const { accountId } = req.params;
    const account = await getRecordById("users", accountId);

    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    res.json(account);
  } catch (error) {
    console.error("Error fetching account:", error);
    res.status(500).json({ error: "Failed to fetch account." });
  }
}

// Update account (disable, enable, permissions)
export async function updateSuperAdminAccount(req, res) {
  try {
    const { accountId } = req.params;
    const { status, permissions, role } = req.body;

    const account = await getRecordById("users", accountId);
    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    const updates = {};
    if (status) updates.status = status;
    if (permissions) updates.permissions = permissions;
    if (role) updates.role = role;

    const updated = await updateRecord("users", accountId, updates);

    // Log this action
    await logAdminAudit(req, "ACCOUNT_UPDATED", {
      accountId,
      changes: updates,
      targetEmail: account.email,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating account:", error);
    res.status(500).json({ error: "Failed to update account." });
  }
}

// Archive an account
export async function archiveAccount(req, res) {
  try {
    const { accountId } = req.params;

    const account = await getRecordById("users", accountId);
    if (!account) {
      return res.status(404).json({ error: "Account not found." });
    }

    // Move to archived collection (store ISO timestamp)
    const nowIso = new Date().toISOString();
    await addRecord("archivedAccounts", {
      ...account,
      originalId: accountId,
      archivedAt: nowIso,
      archivedBy: req.user.uid,
    });

    // Mark as archived in users (store ISO timestamp)
    await updateRecord("users", accountId, {
      status: "archived",
      archivedAt: nowIso,
    });

    // Log this action
    await logAdminAudit(req, "ACCOUNT_ARCHIVED", {
      accountId,
      email: account.email,
    });

    res.json({ message: "Account archived successfully." });
  } catch (error) {
    console.error("Error archiving account:", error);
    res.status(500).json({ error: "Failed to archive account." });
  }
}

// Restore an archived account
export async function restoreAccount(req, res) {
  try {
    const { archiveId } = req.params;

    const archivedAccount = await getRecordById("archivedAccounts", archiveId);
    if (!archivedAccount) {
      return res.status(404).json({ error: "Archived account not found." });
    }

    const originalId = archivedAccount.originalId;

    // Restore to users collection
    await updateRecord("users", originalId, {
      status: "active",
      archivedAt: null,
    });

    // Remove from archived
    await deleteRecord("archivedAccounts", archiveId);

    // Log this action
    await logAdminAudit(req, "ACCOUNT_RESTORED", {
      accountId: originalId,
      email: archivedAccount.email,
    });

    res.json({ message: "Account restored successfully." });
  } catch (error) {
    console.error("Error restoring account:", error);
    res.status(500).json({ error: "Failed to restore account." });
  }
}

// Get audit logs (login and account management)
export async function getAuditLogs(req, res) {
  try {
    const adminAuthLogs = await getCollection("adminAuthAuditLogs");
    const superAdminAuthLogs = await getCollection("superadminAuthAuditLogs");
    const adminActionLogs = await getCollection("adminAuditLogs");

    // Combine and sort by timestamp
    const combined = [
      ...adminAuthLogs.map((log) => ({
        ...log,
        logType: "admin-auth",
      })),
      ...superAdminAuthLogs.map((log) => ({
        ...log,
        logType: "superadmin-auth",
      })),
      ...adminActionLogs.map((log) => ({
        ...log,
        logType: "action",
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(combined.slice(0, 100)); // Return last 100 logs
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs." });
  }
}

// Get archived accounts
export async function getArchive(req, res) {
  try {
    const archivedAccounts = await getCollection("archivedAccounts");

    // Also include rejected document requests as part of trash/archive
    const rejectedDocs = await getCollection("rejectedDocumentRequests");

    const formattedAccounts = archivedAccounts.map((a) => {
      // Normalize archivedAt to ISO string for consistent frontend rendering
      let archivedAtIso = null;
      if (a.archivedAt) {
        if (typeof a.archivedAt === 'string') archivedAtIso = a.archivedAt;
        else if (a.archivedAt instanceof Date) archivedAtIso = a.archivedAt.toISOString();
        else if (a.archivedAt.seconds) archivedAtIso = new Date(a.archivedAt.seconds * 1000).toISOString();
        else archivedAtIso = String(a.archivedAt);
      }

      return {
        id: a.id,
        archivedAt: archivedAtIso,
        archivedBy: a.archivedBy,
        record: {
          fullName: a.fullName || a.email,
          email: a.email,
          role: a.role || "user",
          status: a.status || "archived",
        },
      };
    });

    const formattedRejectedDocs = (Array.isArray(rejectedDocs) ? rejectedDocs : []).map((d) => {
      let rejectedAtIso = null;
      if (d.rejectedAt) {
        if (typeof d.rejectedAt === 'string') rejectedAtIso = d.rejectedAt;
        else if (d.rejectedAt instanceof Date) rejectedAtIso = d.rejectedAt.toISOString();
        else if (d.rejectedAt.seconds) rejectedAtIso = new Date(d.rejectedAt.seconds * 1000).toISOString();
        else rejectedAtIso = String(d.rejectedAt);
      }

      return {
        id: d.id,
        archivedAt: rejectedAtIso,
        archivedBy: d.rejectedBy,
        record: {
          fullName: d.citizenName || d.citizenEmail || 'Unknown',
          email: d.citizenEmail || '',
          role: 'document-request',
          status: 'rejected',
          requestId: d.requestId,
          documentType: d.documentType,
        },
      };
    });

    // Combine and sort by archived/rejected time descending
    const combined = [...formattedAccounts, ...formattedRejectedDocs].sort((a, b) => {
      const ta = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
      const tb = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
      return tb - ta;
    });

    res.json(combined);
  } catch (error) {
    console.error("Error fetching archive:", error);
    res.status(500).json({ error: "Failed to fetch archive." });
  }
}

// Get superadmin settings
export async function getSuperAdminSettings(req, res) {
  try {
    const settingsId = req.user.uid;
    const settings = await getRecordById("superadminSettings", settingsId);

    if (!settings) {
      return res.json({
        notifications: {
          emailAlerts: true,
          auditLogAlerts: true,
          accountManagementAlerts: true,
        },
        preferences: {
          theme: "light",
          language: "en",
        },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings." });
  }
}

// Update superadmin settings
export async function updateSuperAdminSettings(req, res) {
  try {
    const settingsId = req.user.uid;
    const {
      notifications,
      preferences,
      siteName,
      contactEmail,
      contactPhone,
      workingHours,
      street,
      purok,
      barangay,
      city,
      province,
      zipCode,
      timeZone,
    } = req.body;

    const settings = {
      notifications,
      preferences,
      siteName,
      contactEmail,
      contactPhone,
      workingHours,
      street,
      purok,
      barangay,
      city,
      province,
      zipCode,
      timeZone,
    };

    await updateRecord("superadminSettings", settingsId, settings);

    // Log this action
    await logAdminAudit(req, "SETTINGS_UPDATED", { settings });

    res.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings." });
  }
}

// Create a new admin account (superadmin only)
export async function createAdminAccount(req, res) {
  try {
    const { email, firstName, lastName, middleName, password } = req.body;

    if (!email || !firstName || !lastName || !password) {
      return res
        .status(400)
        .json({ error: "Email, first name, last name, and password required." });
    }

    // Check if email already exists
    const existing = await queryCollection("users", [
      { field: "email", op: "==", value: email },
    ]);

    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already in use." });
    }

    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

    // Create via Firebase Auth API (reuse from authController pattern)
    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
    const authResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    if (!authResponse.ok) {
      const error = await authResponse.json();
      throw new Error(error.error?.message || "Failed to create account");
    }

    const firebaseUser = await authResponse.json();
    const userId = firebaseUser.localId;

    // Create user profile in Firestore
    const profile = await addRecord("users", {
      id: userId,
      email,
      firstName,
      middleName,
      lastName,
      fullName,
      role: "admin",
      status: "active",
      permissions: [],
      createdAt: new Date(),
    });

    // Log this action
    await logAdminAudit(req, "ADMIN_ACCOUNT_CREATED", {
      newAdminId: userId,
      email,
      createdBy: req.user.email,
    });

    res.json({
      message: "Admin account created successfully.",
      account: profile,
    });
  } catch (error) {
    console.error("Error creating admin account:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to create admin account." });
  }
}
