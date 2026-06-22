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
  return requireRole("admin", "superadmin")(req, res, next);
}

export function requireSuperAdmin(req, res, next) {
  return requireRole("superadmin")(req, res, next);
}

export function requireUserAdminSuper(req, res, next) {
  return requireRole("user", "admin", "superadmin")(req, res, next);
}

export function requireUserOrAdmin(req, res, next) {
  return requireRole("user", "admin", "superadmin")(req, res, next);
}
