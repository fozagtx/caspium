import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';

const DB_PATH = path.join(__dirname, '..', 'data', 'payments.db');

interface PaymentRow {
  id: string;
  payer: string;
  deploy_hash: string | null;
  endpoint: string;
  price_cents: number;
  price_usd: number;
  response_ms: number | null;
  created_at: number;
}

interface LogEntry {
  payer: string;
  deployHash?: string;
  endpoint: string;
  responseMs: number;
  priceCents?: number;
}

interface Stats {
  total: { q: number; rev: number };
  recent: { q: number; rev: number };
  uniq: number;
  byEndpoint: Array<{ endpoint: string; q: number; rev: number }>;
  recentPayments: PaymentRow[];
  daily: Array<{ d: string; q: number; rev: number }>;
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(`CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payer TEXT NOT NULL,
      deploy_hash TEXT,
      endpoint TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      price_usd REAL NOT NULL,
      response_ms INTEGER,
      created_at INTEGER NOT NULL
    )`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer)`);
  }
  return db;
}

export function logPayment({ payer, deployHash, endpoint, responseMs, priceCents = 5 }: LogEntry): string {
  const d = getDb();
  const id = uuid();
  d.prepare(`INSERT INTO payments (id, payer, deploy_hash, endpoint, price_cents, price_usd, response_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, payer, deployHash ?? null, endpoint, priceCents, priceCents / 100, responseMs, Date.now());
  return id;
}

export function getStats(hours = 24): Stats {
  const d = getDb();
  const since = Date.now() - hours * 3_600_000;

  const total = d.prepare(`SELECT COUNT(*) as q, COALESCE(SUM(price_usd),0) as rev FROM payments`).get() as { q: number; rev: number };
  const recent = d.prepare(`SELECT COUNT(*) as q, COALESCE(SUM(price_usd),0) as rev FROM payments WHERE created_at > ?`).get(since) as { q: number; rev: number };
  const uniq = (d.prepare(`SELECT COUNT(DISTINCT payer) as c FROM payments WHERE created_at > ?`).get(since) as { c: number }).c;
  const byEndpoint = d.prepare(`SELECT endpoint, COUNT(*) as q, COALESCE(SUM(price_usd),0) as rev FROM payments WHERE created_at > ? GROUP BY endpoint ORDER BY rev DESC`).all(since) as Array<{ endpoint: string; q: number; rev: number }>;
  const recentPayments = d.prepare(`SELECT * FROM payments ORDER BY created_at DESC LIMIT 20`).all() as PaymentRow[];
  const daily = d.prepare(`SELECT date(created_at/1000,'unixepoch') as d, COUNT(*) as q, COALESCE(SUM(price_usd),0) as rev FROM payments GROUP BY d ORDER BY d ASC`).all() as Array<{ d: string; q: number; rev: number }>;

  return { total, recent, uniq, byEndpoint, recentPayments, daily };
}
