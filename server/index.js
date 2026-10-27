const express = require("express");
const authRoutes = require("./routes/auth");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");
const productRoutes = require("./routes/products");
const inventoryRoutes = require("./routes/inventory");
const billingRoutes = require("./routes/billing");
const adminRoutes = require("./routes/admin");
const purchaseRoutes = require("./routes/purchases");
const returnRoutes = require("./routes/returns");
const analyticsRoutes = require("./routes/analytics");
const alertRoutes = require("./routes/alerts");
const {
  authenticateToken,
  allowRoles,
} = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/alerts", alertRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Kiara Medicals API is running!",
  });
});

app.get("/api/health/db", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DATABASE() AS databaseName, VERSION() AS mysqlVersion"
    );

    res.json({
      success: true,
      message: "MySQL connection successful!",
      database: rows[0].databaseName,
      version: rows[0].mysqlVersion,
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      success: false,
      message: "MySQL connection failed.",
    });
  }
});

// Any logged-in user can access this route
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// Only the admin can access this route
app.get(
  "/api/auth/admin-test",
  authenticateToken,
  allowRoles("ADMIN"),
  (req, res) => {
    res.json({
      success: true,
      message: "Admin access verified.",
      user: req.user,
    });
  }
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

