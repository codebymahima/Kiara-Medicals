/** Block write operations for Admin (read-only operational access per SRS). */
function requireShopUser(req, res, next) {
  if (!req.user || req.user.role !== "SHOP_USER") {
    return res.status(403).json({
      success: false,
      message:
        "Administrators have read-only access. Shop users perform branch operations.",
    });
  }

  next();
}

module.exports = { requireShopUser };
