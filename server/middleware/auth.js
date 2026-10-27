const jwt = require("jsonwebtoken");
const pool = require("../db");

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Expected format: Bearer <token>
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    // Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Reload current account status and role from database
    const [rows] = await pool.execute(
      `SELECT
         u.user_id,
         u.full_name,
         u.username,
         u.role,
         u.branch_id,
         u.is_active,
         b.branch_name,
         b.is_active AS branch_is_active
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.branch_id
       WHERE u.user_id = ?
       LIMIT 1`,
      [decoded.sub]
    );

    const user = rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is inactive or unavailable.",
      });
    }

    if (user.role === "SHOP_USER") {
      if (
        user.branch_id == null ||
        !user.branch_name ||
        !user.branch_is_active
      ) {
        return res.status(403).json({
          success: false,
          message: "Assigned branch is unavailable.",
        });
      }
    } else if (user.role === "ADMIN") {
      if (user.branch_id != null) {
        return res.status(403).json({
          success: false,
          message: "Invalid account configuration.",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Account role is not permitted.",
      });
    }

    // Attach verified, current user information to the request
    req.user = {
      userId: String(user.user_id),
      fullName: user.full_name,
      username: user.username,
      role: user.role,
      branchId: user.branch_id == null ? null : String(user.branch_id),
      branchName: user.branch_name || null,
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    console.error("Authentication error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Authentication could not be completed.",
    });
  }
}

// Restrict a route to specific roles
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
}

// Check whether the logged-in user may access a particular branch
function authorizeBranch(req, res, next) {
  const requestedBranchId = String(
    req.params.branchId || req.query.branchId || ""
  );

  if (req.user.role === "ADMIN") {
    return next();
  }

  if (
    req.user.role === "SHOP_USER" &&
    requestedBranchId === req.user.branchId
  ) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "You cannot access another branch's data.",
  });
}

module.exports = {
  authenticateToken,
  allowRoles,
  authorizeBranch,
};