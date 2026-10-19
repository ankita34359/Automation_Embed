import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { validateRegistration } from "./rules.js";
import { SLOT_NAMES, FLOW_URL_PREFIX } from "./slots.js";
import { createDispatcher } from "./outbound.js";
import { toCsv } from "./csv.js";

const SESSION_COOKIE = "hd_session";
const SESSION_MS = 8 * 60 * 60 * 1000;
const FLOW_ACTIONS = ["published", "updated", "paused", "deleted"];

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b)); // equal length digests: no length leak

// env is read per request, so tests (and a late-set variable) behave; secrets are never logged or returned.
export function createApp({ db, env = process.env, dispatch = createDispatcher(db), distDir } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser(env.SESSION_SECRET || undefined));

  const missing = (names) => names.filter((n) => !env[n]);
  const notConfigured = (res, names) => res.status(503).json({ error: `Server is missing: ${names.join(", ")}` });

  // ---- admin session -------------------------------------------------------------------------
  const failures = new Map(); // ip -> { n, until }: slow down password guessing
  function requireAdmin(req, res, next) {
    const m = missing(["SESSION_SECRET"]);
    if (m.length) return notConfigured(res, m);
    const exp = Number(req.signedCookies?.[SESSION_COOKIE]);
    if (!Number.isFinite(exp) || exp < Date.now()) return res.status(401).json({ error: "Please sign in" });
    next();
  }

  // 1. login / logout
  app.post("/api/admin/login", (req, res) => {
    const m = missing(["ADMIN_PASSWORD", "SESSION_SECRET"]);
    if (m.length) return notConfigured(res, m);
    const f = failures.get(req.ip);
    if (f && f.n >= 8 && f.until > Date.now()) return res.status(429).json({ error: "Too many attempts. Try again in a minute." });
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!same(password, env.ADMIN_PASSWORD)) {
      failures.set(req.ip, { n: (f && f.until > Date.now() ? f.n : 0) + 1, until: Date.now() + 60_000 });
      return res.status(401).json({ error: "That password is not right" });
    }
    failures.delete(req.ip);
    res.cookie(SESSION_COOKIE, String(Date.now() + SESSION_MS), {
      httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production", signed: true, maxAge: SESSION_MS, path: "/",
    });
    res.json({ ok: true });
  });

  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production", signed: true, path: "/" });
    res.json({ ok: true });
  });

  // 2. embed token for the prebuilt UI: three claims, HS256, no exp. unique_identifier comes from env only.
  app.get("/api/viasocket/token", requireAdmin, (_req, res) => {
    const m = missing(["VIASOCKET_ORG_ID", "VIASOCKET_PROJECT_ID", "VIASOCKET_EMBED_SECRET", "VIASOCKET_UNIQUE_ID"]);
    if (m.length) return notConfigured(res, m);
    const token = jwt.sign(
      { org_id: env.VIASOCKET_ORG_ID, project_id: env.VIASOCKET_PROJECT_ID, unique_identifier: env.VIASOCKET_UNIQUE_ID },
      env.VIASOCKET_EMBED_SECRET,
      { algorithm: "HS256", noTimestamp: true }
    );
    res.set("Cache-Control", "no-store").json({ token });
  });

  // 3. the prebuilt UI tells the browser what the admin published; the browser tells us.
  app.post("/api/viasocket/flow", requireAdmin, (req, res) => {
    const { slot, id, action, status, title, webhookurl, payload } = req.body ?? {};
    if (!SLOT_NAMES.includes(slot)) return res.status(400).json({ error: "Unknown slot" });
    if (typeof id !== "string" || !id || id.length > 100) return res.status(400).json({ error: "Missing flow id" });
    if (!FLOW_ACTIONS.includes(action)) return res.status(400).json({ error: "Unsupported flow action" });

    const existing = db.prepare("SELECT flow_id FROM integration_slots WHERE slot = ?").get(slot);
    const now = new Date().toISOString();

    if (action === "deleted" || action === "paused") {
      // An event for some other flow (e.g. an abandoned draft opened for this slot) must not disturb the live one.
      if (existing && existing.flow_id !== id) return res.json({ ok: true, ignored: true });
      if (action === "deleted") {
        db.prepare("DELETE FROM integration_slots WHERE slot = ?").run(slot);
        return res.json({ ok: true, slot, state: "not_set_up" });
      }
      if (existing) {
        db.prepare("UPDATE integration_slots SET status='paused', updated_at=? WHERE slot=?").run(now, slot);
        return res.json({ ok: true, slot, state: "paused" });
      }
    }

    if (typeof webhookurl !== "string" || !webhookurl.startsWith(FLOW_URL_PREFIX) || webhookurl.length > 300) {
      return res.status(400).json({ error: `Flow URL must start with ${FLOW_URL_PREFIX}` });
    }
    const state = action === "paused" ? "paused" : "active";
    db.prepare(`
      INSERT INTO integration_slots (slot, flow_id, title, status, webhookurl, payload, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slot) DO UPDATE SET flow_id=excluded.flow_id, title=excluded.title, status=excluded.status,
        webhookurl=excluded.webhookurl, payload=excluded.payload, updated_at=excluded.updated_at
    `).run(slot, id, String(title ?? "").slice(0, 200), state, webhookurl, payload == null ? null : JSON.stringify(payload).slice(0, 20000), now);
    res.json({ ok: true, slot, state });
  });

  // 4. dashboard data
  app.get("/api/admin/summary", requireAdmin, (_req, res) => {
    const slotRows = db.prepare("SELECT slot, flow_id, title, status, updated_at FROM integration_slots").all();
    const slots = SLOT_NAMES.map((slot) => {
      const r = slotRows.find((x) => x.slot === slot);
      return r ? { slot, state: r.status, flow_id: r.flow_id, title: r.title, updated_at: r.updated_at } : { slot, state: "not_set_up", flow_id: null, title: null, updated_at: null };
    });
    const counts = db.prepare(`
      SELECT COUNT(*) AS total,
             COALESCE(SUM(college_group='IET_DAVV'),0) AS iet_davv,
             COALESCE(SUM(college_group='OTHER'),0) AS other,
             COALESCE(SUM(email_status='sent'),0) AS emails_sent,
             COALESCE(SUM(sheet_status='sent'),0) AS sheets_sent
      FROM registrations`).get();
    const registrations = db.prepare(`
      SELECT id, name, email, phone, college, college_group, is_gmail, sheet_status, email_status, email_kind, sheet_error, email_error, created_at
      FROM registrations ORDER BY id DESC LIMIT 500`).all();
    res.set("Cache-Control", "no-store").json({ slots, counts, registrations });
  });

  // 5. CSV of everything
  app.get("/api/admin/registrations.csv", requireAdmin, (_req, res) => {
    const rows = db.prepare("SELECT * FROM registrations ORDER BY id DESC").all();
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="hiredrive-registrations.csv"', "Cache-Control": "no-store" }).send(toCsv(rows));
  });

  // 6. public registration
  app.post("/api/register", (req, res) => {
    const v = validateRegistration(req.body);
    if (!v.ok) return res.status(400).json({ error: "Please check the form", errors: v.errors });
    const r = v.value;
    let id;
    try {
      id = db.prepare(`
        INSERT INTO registrations (name, email, phone_raw, phone, college, college_group, is_gmail, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(r.name, r.email, r.phone_raw, r.phone, r.college, r.college_group, r.is_gmail ? 1 : 0, new Date().toISOString()).lastInsertRowid;
    } catch (err) {
      if (String(err?.code).startsWith("SQLITE_CONSTRAINT")) return res.status(409).json({ error: "This email is already registered." });
      console.error("[register]", err.message);
      return res.status(500).json({ error: "Something went wrong. Please try again." });
    }
    const reg = db.prepare("SELECT * FROM registrations WHERE id = ?").get(id);
    res.status(201).json({ ok: true, id: Number(id), name: reg.name });
    setImmediate(() => dispatch(reg).catch((e) => console.error("[dispatch]", e.message))); // after the reply, never blocks it
  });

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

  // ---- the built app ------------------------------------------------------------------------
  const dist = distDir ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: "1h" }));
    app.get("/{*splat}", (_req, res) => res.set("Cache-Control", "no-cache").sendFile(path.join(dist, "index.html")));
  }
  return app;
}
