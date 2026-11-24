const mysql = require("mysql2/promise");
require("dotenv").config();
const { executeMockQuery, createMockConnection } = require("./mockDb");

let isMockMode = false;

const rawPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 2000,
  queueLimit: 0,
});

// Test connection on boot
(async () => {
  try {
    const conn = await Promise.race([
      rawPool.getConnection(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timed out")), 2000)
      ),
    ]);
    conn.release();
    console.log("Connected to MySQL successfully!");
  } catch (err) {
    console.warn(
      `MySQL not available (${err.message}). Using local store fallback.`
    );
    isMockMode = true;
  }
})();

const poolWrapper = {
  async execute(sql, params) {
    if (isMockMode) {
      return executeMockQuery(sql, params);
    }
    try {
      return await rawPool.execute(sql, params);
    } catch (err) {
      console.warn(`MySQL error (${err.message}), falling back to local store.`);
      isMockMode = true;
      return executeMockQuery(sql, params);
    }
  },

  async query(sql, params) {
    if (isMockMode) {
      return executeMockQuery(sql, params);
    }
    try {
      return await rawPool.query(sql, params);
    } catch (err) {
      console.warn(`MySQL error (${err.message}), falling back to local store.`);
      isMockMode = true;
      return executeMockQuery(sql, params);
    }
  },

  async getConnection() {
    if (isMockMode) {
      return createMockConnection();
    }
    try {
      return await rawPool.getConnection();
    } catch (err) {
      console.warn(`MySQL error (${err.message}), falling back to local connection.`);
      isMockMode = true;
      return createMockConnection();
    }
  },

  async end() {
    try {
      await rawPool.end();
    } catch (_) {}
  },
};

module.exports = poolWrapper;
