-- =========================================================
-- ReFly Payment Dashboard — Database Setup Script
-- Database: zendesk_reporting
-- =========================================================
-- Run this script as a MySQL user with CREATE TABLE / ALTER
-- permission on zendesk_reporting.
-- The reporting_tickets table is assumed to already exist.
-- =========================================================

USE zendesk_reporting;

-- ─── Users table for dashboard authentication ─────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'payment_manager', 'payment_agent', 'viewer') NOT NULL DEFAULT 'viewer',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Check existing indexes on reporting_tickets ──────────
-- Run this first to see what already exists:
-- SHOW INDEX FROM reporting_tickets;
-- EXPLAIN SELECT * FROM reporting_tickets WHERE claim_status = 'pending' LIMIT 25;

-- ─── Selective indexes — add only if not already present ──
-- These are high-value indexes for the most common filter/sort patterns.
-- Evaluate EXPLAIN output before adding.

-- comment/uncomment as needed after running SHOW INDEX:

ALTER TABLE reporting_tickets
  ADD INDEX IF NOT EXISTS idx_ticket_id          (ticket_id),
  ADD INDEX IF NOT EXISTS idx_claim_number       (claim_number),
  ADD INDEX IF NOT EXISTS idx_claim_status       (claim_status),
  ADD INDEX IF NOT EXISTS idx_ticket_status      (ticket_status),
  ADD INDEX IF NOT EXISTS idx_requested_date     (requested_date),
  ADD INDEX IF NOT EXISTS idx_scheduled_date     (scheduled_date),
  ADD INDEX IF NOT EXISTS idx_email              (email(100)),
  ADD INDEX IF NOT EXISTS idx_airline            (airline(100)),
  ADD INDEX IF NOT EXISTS idx_source             (source),
  ADD INDEX IF NOT EXISTS idx_assignee           (assignee(100)),
  ADD INDEX IF NOT EXISTS idx_requester          (requester(100)),
  ADD INDEX IF NOT EXISTS idx_updated_at         (updated_at),
  ADD INDEX IF NOT EXISTS idx_need_payment       (need_payment_details),
  ADD INDEX IF NOT EXISTS idx_need_resign        (need_resign),
  ADD INDEX IF NOT EXISTS idx_dashboard_status   (dashboard_status),
  ADD INDEX IF NOT EXISTS idx_log_id             (log_id);

-- ─── Read-only MySQL user setup ───────────────────────────
-- Replace 'your_secure_password' with a strong random password.
-- Run this as MySQL root or an admin user.

-- CREATE USER IF NOT EXISTS 'refly_reporting_ro'@'127.0.0.1'
--   IDENTIFIED BY 'your_secure_password';

-- REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'refly_reporting_ro'@'127.0.0.1';

-- Grant SELECT only on specific tables:
-- GRANT SELECT ON zendesk_reporting.reporting_tickets TO 'refly_reporting_ro'@'127.0.0.1';
-- GRANT SELECT ON zendesk_reporting.users TO 'refly_reporting_ro'@'127.0.0.1';

-- Grant INSERT only on audit_log (if using DB audit):
-- GRANT INSERT ON zendesk_reporting.audit_log TO 'refly_reporting_ro'@'127.0.0.1';

-- FLUSH PRIVILEGES;

-- ─── Verify user has no access to refly_db ────────────────
-- SHOW GRANTS FOR 'refly_reporting_ro'@'127.0.0.1';
