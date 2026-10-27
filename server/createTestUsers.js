require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("./db");

async function createTestUsers() {
  try {
    const testAccounts = [
      {
        username: "testadmin",
        password: "Admin@12345",
        fullName: "Test Administrator",
        role: "ADMIN",
        branchCode: null,
      },
      {
        username: "shopa",
        password: "ShopA@12345",
        fullName: "Test Shop A User",
        role: "SHOP_USER",
        branchCode: "BR001",
      },
      {
        username: "shopb",
        password: "ShopB@12345",
        fullName: "Test Shop B User",
        role: "SHOP_USER",
        branchCode: "BR002",
      },
      {
        username: "shopc",
        password: "ShopC@12345",
        fullName: "Test Shop C User",
        role: "SHOP_USER",
        branchCode: "BR003",
      },
    ];

    for (const account of testAccounts) {
      const [existing] = await pool.execute(
        "SELECT user_id FROM users WHERE username = ?",
        [account.username]
      );

      if (existing.length > 0) {
        console.log(`Skipped existing user: ${account.username}`);
        continue;
      }

      let branchId = null;

      if (account.branchCode) {
        const [branches] = await pool.execute(
          `SELECT branch_id FROM branches
           WHERE branch_code = ? AND is_active = TRUE`,
          [account.branchCode]
        );

        if (branches.length === 0) {
          throw new Error(
            `Active branch not found: ${account.branchCode}`
          );
        }

        branchId = branches[0].branch_id;
      }

      const passwordHash = await bcrypt.hash(account.password, 12);

      await pool.execute(
        `INSERT INTO users
          (branch_id, full_name, username, password_hash, role)
         VALUES (?, ?, ?, ?, ?)`,
        [
          branchId,
          account.fullName,
          account.username,
          passwordHash,
          account.role,
        ]
      );

      console.log(`Created test user: ${account.username}`);
    }
  } catch (error) {
    console.error("Could not create test users:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createTestUsers();