import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface WakeRecord {
  wakeId: string;
  timestamp: string;
  duration?: number;
  cost?: number;
  turns?: number;
  actions?: string[];
}

const DEFAULT_DB_PATH =
  process.env.NODE_ENV === 'test' ? 'data/test-spectre.db' : 'data/spectre.db';

let db: Database.Database | null = null;

function getDB(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

export function initDB(path?: string): void {
  const dbPath = resolve(path ?? DEFAULT_DB_PATH);
  mkdirSync(dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS wakes (
      wake_id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      duration INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      turns INTEGER DEFAULT 0,
      actions TEXT DEFAULT '[]'
    )
  `);
}

export function saveWakeRecord(record: WakeRecord): void {
  const stmt = getDB().prepare(`
    INSERT OR REPLACE INTO wakes (wake_id, timestamp, duration, cost, turns, actions)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.wakeId,
    record.timestamp,
    record.duration ?? 0,
    record.cost ?? 0,
    record.turns ?? 0,
    JSON.stringify(record.actions ?? []),
  );
}

export function getRecentWakes(limit = 10): WakeRecord[] {
  const rows = getDB()
    .prepare('SELECT * FROM wakes ORDER BY timestamp DESC LIMIT ?')
    .all(limit) as Array<{
    wake_id: string;
    timestamp: string;
    duration: number;
    cost: number;
    turns: number;
    actions: string;
  }>;

  return rows.map((row) => ({
    wakeId: row.wake_id,
    timestamp: row.timestamp,
    duration: row.duration,
    cost: row.cost,
    turns: row.turns,
    actions: JSON.parse(row.actions) as string[],
  }));
}

export function getTotalCost(days = 30): number {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const row = getDB()
    .prepare('SELECT COALESCE(SUM(cost), 0) as total FROM wakes WHERE timestamp >= ?')
    .get(since) as { total: number };
  return Math.round(row.total * 100) / 100;
}
