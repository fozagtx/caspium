// Payment tracking — SQLite. Production.

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuid } = require('uuid');

const DB = path.join(__dirname, '..', 'data', 'payments.db');

let db;
function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB);
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

function logPayment({ payer, deployHash, endpoint, responseMs, priceCents = 5 }) {
  const d = getDb();
  const id = uuid();
  d.prepare(`INSERT INTO payments (id, payer, deploy_hash, endpoint, price_cents, price_usd, response_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, payer, deployHash, endpoint, priceCents, priceCents / 100, responseMs, Date.now());
  return id;
}

function getStats(hours = 24) {
  const d = getDb();
  const since = Date.now() - hours * 3600000;

  const total = d.prepare(`SELECT COUNT(*) as q, COALESCE(SUM(price_usd),0) as rev FROM payments`).get();
  const recent = d.prepare(`SELECT COUNT(*) as q, COALESCE(SUM(price_usd),0) as rev FROM payments WHERE created_at > ?`).get(since);
  const uniq = d.prepare(`SELECT COUNT(DISTINCT payer) as c FROM payments WHERE created_at > ?`).get(since);
  const byEndpoint = d.prepare(`SELECT endpoint, COUNT(*) as q, COALESCE(SUM(price_usd),0) as rev FROM payments WHERE created_at > ? GROUP BY endpoint ORDER BY rev DESC`).all(since);
  const recentPayments = d.prepare(`SELECT * FROM payments ORDER BY created_at DESC LIMIT 20`).all();
  const daily = d.prepare(`SELECT date(created_at/1000,'unixepoch') as d, COUNT(*) as q, COALESCE(SUM(price_usd),0) as rev FROM payments GROUP BY d ORDER BY d ASC`).all();

  return { total, recent, uniq: uniq.c, byEndpoint, recentPayments, daily };
}

module.exports = { logPayment, getStats };
