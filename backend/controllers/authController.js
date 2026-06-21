import { auth, isFirebaseReady } from "../config/firebase.js";
import { addRecord, getRecordById, updateRecord, queryCollection } from "../services/firestoreService.js";
import { logAudit, logAdminAudit, logAdminAuthAudit } from "../middleware/audit.js";

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const ADMIN_REGISTRATION_TOKEN = process.env.ADMIN_REGISTRATION_TOKEN || "1234567890123";
const OTP_EXPIRATION_MS = 5 * 60 * 1000;
const otpStore = new Map();

function normalizePhoneNumber(phone) {
  let normalized = String(phone || "").trim();
  if (normalized.startsWith("+63")) {
    normalized = "0" + normalized.slice(3);
  }
  return normalized;
}

function isValidPhoneNumber(phone) {
  const normalized = normalizePhoneNumber(phone);
  return /^09\d{9}$/.test(normalized);
}

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

  return {
    idToken: firebaseData.idToken,
    refreshToken: firebaseData.refreshToken,
    expiresIn: firebaseData.expiresIn,
    user: {
      uid: firebaseData.localId,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
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
    const normalizedMobile = normalizePhoneNumber(mobile);
    const displayName = [normalizedFirstName, (middleName || "").trim(), normalizedLastName]
      .filter(Boolean)
      .join(" ");

    if (!normalizedFirstName || !normalizedLastName || !email || !password) {
      return res.status(400).json({ error: "First name, last name, email, and password are required." });
    }

    if (!normalizedMobile || !isValidPhoneNumber(normalizedMobile)) {
      return res.status(400).json({ error: "Mobile number must be 11 digits starting with 09 or +639." });
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
      mobile: normalizedMobile || "",
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
    const { firstName, middleName, lastName, email, password, adminToken } = req.body;

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

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role: "admin" });

    const profile = await addRecord("users", {
      id: userRecord.uid,
      uid: userRecord.uid,
      fullName,
      firstName,
      middleName: middleName || "",
      lastName,
      email,
      role: "admin",
      status: "active",
    });

    await logAdminAuthAudit(email, "ADMIN_REGISTRATION", { uid: userRecord.uid, email, fullName });

    res.status(201).json({
      message: "Admin account created successfully.",
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

    if (portal === "admin" && response.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access only. Use the user portal to sign in." });
    }

    if (portal === "user" && response.user.role === "admin") {
      return res.status(403).json({ error: "Please use the Administrator Portal to sign in." });
    }

    const auditReq = { ...req, user: response.user };
    if (portal === 'admin') {
      await logAdminAudit(auditReq, "ADMIN_LOGIN", { email });
    } else {
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
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!normalizedPhone) {
      return res.status(400).json({ error: "Phone number is required." });
    }

    if (!isValidPhoneNumber(normalizedPhone)) {
      return res.status(400).json({ error: "Phone number must be 11 digits starting with 09 or +639." });
    }

    const matchedUsers = await queryCollection("users", [
      { field: "mobile", op: "==", value: normalizedPhone },
    ]);

    if (!matchedUsers.length) {
      return res.status(404).json({ error: "Mobile number is not registered." });
    }

    const user = matchedUsers[0];
    const otpCode = generateOtpCode();
    const expiration = Date.now() + OTP_EXPIRATION_MS;
    otpStore.set(normalizedPhone, { code: otpCode, expiresAt: expiration });

    console.log(`Forgot password OTP for ${normalizedPhone}: ${otpCode} (expires in 5 minutes)`);

    return res.json({ message: "Verification code sent. Use the code shown in the server logs for demo purposes." });
  } catch (error) {
    console.error("Forgot password request failed:", error);
    return res.status(500).json({ error: "Forgot password request could not be processed." });
  }
}

function getStoredOtp(phone) {
  const stored = otpStore.get(phone);
  if (!stored) return null;
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return null;
  }
  return stored;
}

export async function verifyOtp(req, res) {
  try {
    const { phone, otp } = req.body;
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!normalizedPhone || !otp) {
      return res.status(400).json({ error: "Phone and OTP are required." });
    }

    const stored = getStoredOtp(normalizedPhone);
    if (!stored || stored.code !== String(otp).trim()) {
      return res.status(400).json({ error: "Invalid or expired verification code." });
    }

    return res.json({ message: "OTP verified." });
  } catch (error) {
    console.error("OTP verification failed:", error);
    return res.status(500).json({ error: "OTP verification could not be processed." });
  }
}

export async function resetPassword(req, res) {
  try {
    const { phone, otp, newPassword } = req.body;
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!normalizedPhone || !otp || !newPassword) {
      return res.status(400).json({ error: "Phone, OTP, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

    const stored = getStoredOtp(normalizedPhone);
    if (!stored || stored.code !== String(otp).trim()) {
      return res.status(400).json({ error: "Invalid or expired verification code." });
    }

    const matchedUsers = await queryCollection("users", [
      { field: "mobile", op: "==", value: normalizedPhone },
    ]);

    if (!matchedUsers.length) {
      return res.status(404).json({ error: "Mobile number is not registered." });
    }

    const user = matchedUsers[0];

    if (isFirebaseReady && auth) {
      await auth.updateUser(user.uid, { password: newPassword });
    } else {
      await updateRecord("users", user.uid, { password: newPassword });
    }

    otpStore.delete(normalizedPhone);
    await logAudit(req, "PASSWORD_RESET_COMPLETED", {
      uid: user.uid,
      email: user.email,
      mobile: normalizedPhone,
    });

    return res.json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Password reset failed:", error);
    return res.status(500).json({ error: "Password reset could not be completed." });
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
    phone: profile.phone || "",
    purok: profile.purok || "",
    seniorId: profile.seniorId || "",
  });
}

export async function updateProfile(req, res) {
  const { fullName, phone, purok } = req.body;
  const updated = await updateRecord("users", req.user.uid, {
    fullName,
    phone,
    purok,
  });

  if (!updated) {
    return res.status(404).json({ error: "Profile not found." });
  }

  await logAudit(req, "PROFILE_UPDATED", { uid: req.user.uid });
  res.json(updated);
}
