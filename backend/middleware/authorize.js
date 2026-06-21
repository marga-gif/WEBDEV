export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission to access this resource.",
        requiredRoles: roles,
      });
    }

    next();
  };
}

export function requireAdmin(req, res, next) {
  return requireRole("admin")(req, res, next);
}

export function requireUserOrAdmin(req, res, next) {
  return requireRole("user", "admin")(req, res, next);
}
