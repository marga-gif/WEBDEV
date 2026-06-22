import { auth, isFirebaseReady } from "../config/firebase.js";
import { getRecordById } from "../services/firestoreService.js";

/**
 * Enforces strict Firebase ID token verification and builds the request profile context.
 */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required. Provide a Bearer token." });
  }

  // 1. Guard check for backend initialization configuration status
  if (!isFirebaseReady || !auth) {
    return res.status(503).json({ error: "Authentication service is temporarily unavailable." });
  }

  try {
    // 2. Cryptographically verify the client token signature with Firebase Admin
    const decoded = await auth.verifyIdToken(token);
    
    // 3. Retrieve additional document records from your Firestore database layer
    let profile = await getRecordById("users", decoded.uid);
    
    // 4. Secure role resolution (Prioritizes Token Claims over Database lookups to avoid client injection)
    const tokenRole = String(decoded.role || (decoded.customClaims && decoded.customClaims.role) || (decoded.admin ? "admin" : ""))
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

    const profileRole = String(profile && profile.role ? profile.role : "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

    const resolvedRole = tokenRole || profileRole || "user";

    // 5. Instantiated safe fallback if the authenticated entity lacks an existing cloud database entry
    if (!profile) {
      profile = {
        id: decoded.uid,
        uid: decoded.uid,
        email: decoded.email || "",
        role: resolvedRole,
        fullName: decoded.name || decoded.email || "User",
      };
    }

    // 6. Mutate global payload structure for downward controller access execution
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: resolvedRole,
      fullName: profile.fullName || profile.displayName || decoded.name || "",
      profile,
    };

    return next(); // Return ensures execution contexts drop immediately
  } catch (error) {
    // Graceful handling for invalid signatures or expired sessions
    return res.status(401).json({ 
      error: "Invalid or expired token.", 
      details: process.env.NODE_ENV === "development" ? error.message : undefined 
    });
  }
}

/**
 * Intercepts optional validation vectors without interrupting requests for unauthenticated guests.
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  // Directly pass the execution array rather than wrapping returns incorrectly
  return authenticate(req, res, next);
}