const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    // 1. Validate input
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    // 2. Ensure JWT secret is configured
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from environment.");
      return res.status(500).json({
        success: false,
        message: "Server configuration error.",
      });
    }

    // 3. Find user and their assigned branch
    const [rows] = await pool.execute(
      `SELECT
         u.user_id,
         u.full_name,
         u.username,
         u.password_hash,
         u.role,
         u.branch_id,
         u.is_active,
         b.branch_name,
         b.is_active AS branch_is_active
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.branch_id
       WHERE u.username = ?
       LIMIT 1`,
      [username.trim()]
    );

    const user = rows[0];

    // Use a generic message so we don't reveal whether a username exists
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    // 4. Verify the password against its stored hash
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    // 5. Enforce role and branch rules
    if (user.role === "SHOP_USER") {
      if (
        user.branch_id == null ||
        !user.branch_name ||
        !user.branch_is_active
      ) {
        return res.status(403).json({
          success: false,
          message: "Your assigned branch is unavailable.",
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
        message: "This account role is not permitted.",
      });
    }

    // 6. Create JWT token
    const token = jwt.sign(
      {
        role: user.role,
        branchId: user.branch_id == null ? null : String(user.branch_id),
      },
      process.env.JWT_SECRET,
      {
        subject: String(user.user_id),
        expiresIn: process.env.JWT_EXPIRES_IN || "8h",
      }
    );

    // 7. Update last login time
    await pool.execute(
      "UPDATE users SET last_login_at = NOW() WHERE user_id = ?",
      [user.user_id]
    );

    // 8. Return token and safe user details (never return password_hash)
    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        userId: String(user.user_id),
        fullName: user.full_name,
        username: user.username,
        role: user.role,
        branchId: user.branch_id == null ? null : String(user.branch_id),
        branchName: user.branch_name || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      return res.status(503).json({
        success: false,
        message:
          "Database is not reachable. Start MySQL on port 3306 and run database/schema.sql.",
      });
    }

    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      return res.status(503).json({
        success: false,
        message:
          "Database login failed. Check DB_USER and DB_PASSWORD in server/.env.",
      });
    }

    if (error.code === "ER_BAD_DB_ERROR") {
      return res.status(503).json({
        success: false,
        message:
          'Database "kiara_medicals" not found. Run database/schema.sql and database/seed.sql.',
      });
    }

    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred.",
    });
  }
});

module.exports = router;