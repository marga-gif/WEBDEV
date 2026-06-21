import { auth, isFirebaseReady } from "../config/firebase.js";
import { getRecordById } from "../services/firestoreService.js";

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required. Provide a Bearer token." });
  }

  if (!isFirebaseReady || !auth) {
    return res.status(503).json({ error: "Authentication service is not configured." });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    let profile = await getRecordById("users", decoded.uid);

    if (!profile) {
      profile = {
        id: decoded.uid,
        uid: decoded.uid,
        email: decoded.email || "",
        role: decoded.role || decoded.admin ? "admin" : "user",
        fullName: decoded.name || decoded.email || "User",
      };
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: profile.role || decoded.role || "user",
      fullName: profile.fullName || profile.displayName || decoded.name || "",
      profile,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token.", details: error.message });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  return authenticate(req, res, next);
}
