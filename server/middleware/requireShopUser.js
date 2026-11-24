/** Allow branch operation access for shop roles (User, Manager, Worker). Block write operations for Admin (read-only operational access per SRS). */
function requireShopUser(req, res, next) {
  if (
    !req.user ||
    !["SHOP_USER", "SHOP_MANAGER", "SHOP_WORKER"].includes(req.user.role)
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Administrators have read-only access. Shop staff perform branch operations.",
    });
  }

  next();
}

/** Specific check for actions reserved for Shop Managers / Shop Users (e.g., supplier returns). */
function requireShopManager(req, res, next) {
  if (
    !req.user ||
    !["SHOP_USER", "SHOP_MANAGER"].includes(req.user.role)
  ) {
    return res.status(403).json({
      success: false,
      message:
        "This operation requires Shop Manager or Supervisor permissions.",
    });
  }

  next();
}

module.exports = { requireShopUser, requireShopManager };
