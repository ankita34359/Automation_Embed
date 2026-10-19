import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export function openDb(dataDir = process.env.DATA_DIR || "./data") {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "hiredrive.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone_raw TEXT NOT NULL,
      phone TEXT NOT NULL,
      college TEXT NOT NULL,
      college_group TEXT NOT NULL CHECK (college_group IN ('IET_DAVV','OTHER')),
      is_gmail INTEGER NOT NULL,
      sheet_status TEXT NOT NULL DEFAULT 'pending',
      email_status TEXT NOT NULL DEFAULT 'pending',
      email_kind TEXT,
      sheet_error TEXT,
      email_error TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_registrations_created ON registrations (id DESC);
    CREATE TABLE IF NOT EXISTS integration_slots (
      slot TEXT PRIMARY KEY,
      flow_id TEXT NOT NULL,
      title TEXT,
      status TEXT NOT NULL CHECK (status IN ('active','paused')),
      webhookurl TEXT NOT NULL,
      payload TEXT,
      updated_at TEXT NOT NULL
    );
  `);
  // A restart cancels any send that was in flight. Say so instead of leaving "pending" forever.
  db.prepare("UPDATE registrations SET sheet_status='failed', sheet_error='Interrupted by a server restart' WHERE sheet_status='pending'").run();
  db.prepare("UPDATE registrations SET email_status='failed', email_error='Interrupted by a server restart' WHERE email_status='pending'").run();
  return db;
}
