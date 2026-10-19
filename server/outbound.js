// After a registration is saved: sheet row, AI quote, welcome email. Each one is a POST to the run URL of the
// flow the HR admin published in viaSocket. 20 s timeout, no automatic retries, never throws to the caller.
import { buildWelcomeEmail, extractQuote } from "./email.js";

export const CALL_TIMEOUT_MS = 20_000;
const MAX_IN_FLIGHT = 5; // be polite to Sheets/Gmail when a crowd registers at once

let inFlight = 0;
const waiting = [];
async function limited(fn) {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise((resolve) => waiting.push(resolve));
  inFlight++;
  try { return await fn(); } finally { inFlight--; waiting.shift()?.(); }
}

// Error text for the admin table. Never a URL: run URLs are credentials.
function safeMessage(err) {
  const m = err?.name === "TimeoutError" || err?.name === "AbortError" ? "Timed out after 20 s" : String(err?.message ?? err);
  return m.replace(/https?:\/\/\S+/g, "[url]").slice(0, 200);
}

export async function postToFlow(url, body, fetchImpl = fetch) {
  const res = await limited(() =>
    fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    })
  );
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  if (!res.ok) throw new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`);
  return json ?? text;
}

// Which flow, in which state: sent-path, or why it is skipped.
function lookup(db, slot) {
  const row = db.prepare("SELECT status, webhookurl FROM integration_slots WHERE slot = ?").get(slot);
  if (!row) return { skip: "skipped_not_set_up" };
  if (row.status !== "active") return { skip: "skipped_paused" };
  return { url: row.webhookurl };
}

export function createDispatcher(db, { fetchImpl = fetch, log = console } = {}) {
  const setSheet = db.prepare("UPDATE registrations SET sheet_status=?, sheet_error=? WHERE id=?");
  const setEmail = db.prepare("UPDATE registrations SET email_status=?, email_error=?, email_kind=? WHERE id=?");

  async function sendSheet(reg) {
    const slot = reg.college_group === "IET_DAVV" ? "sheet_iet_davv" : "sheet_other";
    const target = lookup(db, slot);
    if (target.skip) return setSheet.run(target.skip, null, reg.id);
    try {
      await postToFlow(target.url, {
        registration_id: reg.id, name: reg.name, email: reg.email, phone: reg.phone, college: reg.college, registered_at: reg.created_at,
      }, fetchImpl);
      setSheet.run("sent", null, reg.id);
    } catch (err) {
      setSheet.run("failed", safeMessage(err), reg.id);
      log.error(`[sheet] registration ${reg.id}: ${safeMessage(err)}`);
    }
  }

  async function getQuote(reg) {
    const target = lookup(db, "ai_quote");
    if (target.skip) return "";
    try {
      const out = await postToFlow(target.url, { name: reg.name, college: reg.college }, fetchImpl);
      return extractQuote(out);
    } catch (err) {
      log.error(`[ai] registration ${reg.id}: ${safeMessage(err)}`);
      return ""; // fall back to the basic email
    }
  }

  async function sendEmail(reg) {
    const target = lookup(db, "welcome_email");
    if (target.skip) return setEmail.run(target.skip, null, null, reg.id);
    const quote = reg.is_gmail ? await getQuote(reg) : "";
    const mail = buildWelcomeEmail({ name: reg.name, email: reg.email, quote });
    try {
      await postToFlow(target.url, { to: mail.to, subject: mail.subject, body: mail.body }, fetchImpl);
      setEmail.run("sent", null, mail.kind, reg.id);
    } catch (err) {
      setEmail.run("failed", safeMessage(err), mail.kind, reg.id);
      log.error(`[email] registration ${reg.id}: ${safeMessage(err)}`);
    }
  }

  // The sheet row and the email (with its AI quote) run side by side.
  return async function dispatch(reg) {
    await Promise.allSettled([sendSheet(reg), sendEmail(reg)]);
  };
}
