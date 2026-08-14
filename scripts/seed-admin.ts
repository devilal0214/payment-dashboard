/**
 * scripts/seed-admin.ts
 *
 * Creates the initial admin user.
 * Usage: npm run seed-admin
 *
 * Reads from environment variables:
 *   SEED_ADMIN_USERNAME (default: admin)
 *   SEED_ADMIN_PASSWORD (required)
 *   REPORT_DB_HOST, REPORT_DB_USER, REPORT_DB_PASS, REPORT_DB_NAME
 */
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    console.error('❌ SEED_ADMIN_PASSWORD environment variable is required.');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('❌ SEED_ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.REPORT_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.REPORT_DB_PORT || '3306', 10),
    user: process.env.REPORT_DB_USER,
    password: process.env.REPORT_DB_PASS,
    database: process.env.REPORT_DB_NAME || 'zendesk_reporting',
  });

  try {
    const hash = await bcrypt.hash(password, 12);

    await connection.execute(
      `INSERT INTO users (username, password_hash, role, is_active)
       VALUES (?, ?, 'admin', 1)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      [username, hash],
    );

    console.log(`✅ Admin user "${username}" created/updated successfully.`);
    console.log('   Log in at: https://reports.refly.org/login');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
