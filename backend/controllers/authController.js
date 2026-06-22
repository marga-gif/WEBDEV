import { auth, isFirebaseReady } from "../config/firebase.js";
import { addRecord, getRecordById, updateRecord, queryCollection } from "../services/firestoreService.js";
import { logAudit, logAdminAudit, logAdminAuthAudit, logSuperAdminAuthAudit } from "../middleware/audit.js";

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const ADMIN_REGISTRATION_TOKEN = process.env.ADMIN_REGISTRATION_TOKEN || "1234567890123";

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase().replace(/\s+/g, "");
}

async function signInWithPassword(email, password) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const message = data.error?.message || "Login failed.";
    throw new Error(message);
  }
  return data;
}

async function buildAuthResponse(firebaseData) {
  const profile = await getRecordById("users", firebaseData.localId);

  if (!profile) {
    throw new Error("User profile not found. Please contact the barangay office.");
  }

  if (profile.status === "disabled") {
    throw new Error("This account has been disabled.");
  }

  let normalizedRole = normalizeRole(profile.role || "user");
  if (auth) {
    try {
      const authUser = await auth.getUser(firebaseData.localId);
      normalizedRole = normalizeRole(authUser.customClaims?.role || normalizedRole);
    } catch {
      // fallback to Firestore role if auth lookup fails
    }
  }

  return {
    idToken: firebaseData.idToken,
    refreshToken: firebaseData.refreshToken,
    expiresIn: firebaseData.expiresIn,
    user: {
      uid: firebaseData.localId,
      email: profile.email,
      fullName: profile.fullName,
      role: normalizedRole,
      firstName: profile.firstName || "",
      middleName: profile.middleName || "",
      lastName: profile.lastName || "",
      suffix: profile.suffix || "",
      birthDate: profile.birthDate || "",
      gender: profile.gender || "",
      mobile: profile.mobile || "",
      street: profile.street || "",
      barangay: profile.barangay || "",
      city: profile.city || "",
      province: profile.province || "",
      zipCode: profile.zipCode || "",
      photoData: profile.photoData || "",
    },
  };
}

export async function registerUser(req, res) {
  try {
    const {
      firstName,
      middleName,
      lastName,
      suffix,
      birthDate,
      gender,
      email,
      mobile,
      street,
      barangay,
      city,
      province,
      zipCode,
      password,
      confirmPassword,
      photoData,
    } = req.body;

    const normalizedFirstName = (firstName || "").trim();
    const normalizedLastName = (lastName || "").trim();
    const displayName = [normalizedFirstName, (middleName || "").trim(), normalizedLastName]
      .filter(Boolean)
      .join(" ");

    if (!normalizedFirstName || !normalizedLastName || !email || !password) {
      return res.status(400).json({ error: "First name, last name, email, and password are required." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    if (!isFirebaseReady || !auth) {
      return res.status(503).json({ error: "Firebase is not configured on the server." });
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role: "user" });

    const profile = await addRecord("users", {
      id: userRecord.uid,
      uid: userRecord.uid,
      fullName: displayName,
      firstName: normalizedFirstName,
      middleName: (middleName || "").trim(),
      lastName: normalizedLastName,
      suffix: suffix || "",
      birthDate: birthDate || "",
      gender: gender || "",
      email,
      mobile: mobile || "",
      street: street || "",
      barangay: barangay || "",
      city: city || "",
      province: province || "",
      zipCode: zipCode || "",
      photoData: photoData || "",
      role: "user",
      status: "active",
    });

    await logAudit(req, "USER_REGISTERED", { uid: userRecord.uid, email });

    res.status(201).json({
      message: "Account created successfully. You may now log in.",
      user: { uid: profile.uid, email: profile.email, fullName: profile.fullName, role: profile.role },
    });
  } catch (error) {
    const message =
      error.code === "auth/email-already-exists"
        ? "An account with this email already exists."
        : error.message;
    res.status(400).json({ error: message });
  }
}

export async function registerAdmin(req, res) {
  try {
    const { firstName, middleName, lastName, email, password, adminToken, portal } = req.body;

    if (!firstName || !lastName || !email || !password || !adminToken) {
      return res.status(400).json({ error: "All admin registration fields are required." });
    }

    if (adminToken !== ADMIN_REGISTRATION_TOKEN) {
      return res.status(403).json({ error: "Invalid admin registration token." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    if (!isFirebaseReady || !auth) {
      return res.status(503).json({ error: "Firebase is not configured on the server." });
    }

    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    const role = portal === "superadmin" ? "superadmin" : "admin";

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role });

    const profile = await addRecord("users", {
      id: userRecord.uid,
      uid: userRecord.uid,
      fullName,
      firstName,
      middleName: middleName || "",
      lastName,
      email,
      role,
      status: "active",
    });

    const auditType = role === "superadmin" ? "SUPERADMIN_REGISTRATION" : "ADMIN_REGISTRATION";
    await logAdminAuthAudit(email, auditType, { uid: userRecord.uid, email, fullName });

    res.status(201).json({
      message: `${role === "superadmin" ? "SuperAdmin" : "Admin"} account created successfully.`,
      user: { uid: profile.uid, email: profile.email, fullName: profile.fullName, role: profile.role },
    });
  } catch (error) {
    const message =
      error.code === "auth/email-already-exists"
        ? "An account with this email already exists."
        : error.message;
    res.status(400).json({ error: message });
  }
}

export async function loginUser(req, res) {
  try {
    const { email, password, portal } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    if (!FIREBASE_API_KEY) {
      return res.status(503).json({ error: "FIREBASE_API_KEY is not configured." });
    }

    const firebaseData = await signInWithPassword(email, password);
    const response = await buildAuthResponse(firebaseData);

    // Role validation based on portal
    const normalizedRole = normalizeRole(response.user.role || "");

    if (portal === "superadmin" && normalizedRole !== "superadmin") {
      return res.status(403).json({ error: "SuperAdmin access only. Use the SuperAdmin portal to sign in." });
    }

    if (portal === "admin" && normalizedRole !== "admin") {
      return res.status(403).json({ error: "Admin access only. Use the administrator portal to sign in." });
    }

    if (portal === "user" && (normalizedRole === "admin" || normalizedRole === "superadmin")) {
      return res.status(403).json({ error: "Please use the Administrator Portal to sign in." });
    }

    if (portal === 'superadmin') {
      await logSuperAdminAuthAudit(email, "SUPERADMIN_LOGIN", { uid: response.user.uid, email });
    } else if (portal === 'admin') {
      await logAdminAuthAudit(email, "ADMIN_LOGIN", { uid: response.user.uid, email });
    } else {
      const auditReq = { ...req, user: response.user };
      await logAudit(auditReq, "USER_LOGIN", { email });
    }

    res.json(response);
  } catch (error) {
    const friendly =
      error.message === "INVALID_LOGIN_CREDENTIALS"
        ? "Invalid email or password."
        : error.message;
    res.status(401).json({ error: friendly });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { phone } = req.body;
    const normalizedPhone = String(phone || "").trim();

    if (!normalizedPhone) {
      return res.status(400).json({ error: "Phone number is required." });
    }

    const matchedUsers = await queryCollection("users", [
      { field: "mobile", op: "==", value: normalizedPhone },
    ]);

    if (!matchedUsers.length) {
      return res.status(404).json({ error: "Mobile number is not registered." });
    }

    const user = matchedUsers[0];
    await logAudit(req, "PASSWORD_RESET_REQUESTED", {
      uid: user.uid,
      email: user.email,
      mobile: normalizedPhone,
    });

    return res.json({ message: "Verification code sent. Follow the instructions on your mobile device." });
  } catch (error) {
    console.error("Forgot password request failed:", error);
    return res.status(500).json({ error: "Forgot password request could not be processed." });
  }
}

export async function getProfile(req, res) {
  const profile = await getRecordById("users", req.user.uid);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found." });
  }
  res.json({
    uid: profile.uid,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    firstName: profile.firstName || "",
    middleName: profile.middleName || "",
    lastName: profile.lastName || "",
    suffix: profile.suffix || "",
    birthDate: profile.birthDate || "",
    gender: profile.gender || "",
    phone: profile.phone || profile.mobile || "",
    purok: profile.purok || profile.street || "",
    street: profile.street || "",
    barangay: profile.barangay || "",
    city: profile.city || "",
    province: profile.province || "",
    zipCode: profile.zipCode || profile.zip || "",
    seniorId: profile.seniorId || "",
  });
}

export async function updateProfile(req, res) {
  const {
    firstName,
    middleName,
    lastName,
    fullName,
    phone,
    purok,
    street,
    barangay,
    city,
    province,
    zipCode,
  } = req.body;

  if (!firstName || !lastName) {
    return res.status(400).json({ error: "First name and last name are required." });
  }

  const resolvedFullName = fullName || [firstName, middleName, lastName].filter(Boolean).join(" ");

  const updated = await updateRecord("users", req.user.uid, {
    firstName,
    middleName,
    lastName,
    fullName: resolvedFullName,
    phone,
    purok,
    street,
    barangay,
    city,
    province,
    zipCode,
  });

  if (!updated) {
    return res.status(404).json({ error: "Profile not found." });
  }

  await logAudit(req, "PROFILE_UPDATED", { uid: req.user.uid });
  res.json(updated);
}
