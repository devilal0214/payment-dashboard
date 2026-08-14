/**
 * lib/db/pool.ts
 *
 * Server-only MySQL connection pool.
 * Uses mysql2/promise for async/await support.
 * Never import this file in client components.
 */
import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  return mysql.createPool({
    host: process.env.REPORT_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.REPORT_DB_PORT || '3306', 10),
    user: process.env.REPORT_DB_USER,
    password: process.env.REPORT_DB_PASS,
    database: process.env.REPORT_DB_NAME || 'zendesk_reporting',
    connectionLimit: parseInt(process.env.REPORT_DB_POOL_LIMIT || '10', 10),
    waitForConnections: true,
    queueLimit: 0,
    // Safety: read-only queries only — defensive timeout
    connectTimeout: 10_000,
    // Dates returned as strings to avoid TZ issues
    dateStrings: true,
    timezone: 'Z',
    enableKeepAlive: true,
    keepAliveInitialDelay: 30_000,
  });
}

// Reuse pool across hot-reloads in dev
export const pool: mysql.Pool =
  globalThis._mysqlPool ?? (globalThis._mysqlPool = createPool());

/**
 * Execute a parameterized query and return typed rows.
 * All values MUST be passed as params — never string-interpolated.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, params as any);
  return rows as T[];
}

/**
 * Execute a query and return the first row or null.
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/**
 * Execute a COUNT query and return the integer total.
 */
export async function queryCount(sql: string, params?: unknown[]): Promise<number> {
  const rows = await query<{ total: string | number }>(sql, params);
  return Number(rows[0]?.total ?? 0);
}
