// Writes the welcome email. Pure: our code owns the subject and body; the Gmail flow only sends them.
// The Gmail "Send Email" action's Message Body is an HTML field, so the body is simple HTML.
import { COMPANY_NAME, DRIVE_NAME, DRIVE_DATE, VENUE } from "../src/config.js";

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function firstName(name) {
  return String(name ?? "").trim().split(/\s+/)[0] || "there";
}

// AI output is untrusted text: strip wrapping quotes/markdown, collapse whitespace, cap the length.
export function cleanQuote(raw) {
  if (typeof raw !== "string") return "";
  const q = raw.replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  return q.length > 400 ? q.slice(0, 397) + "..." : q;
}

export function buildWelcomeEmail({ name, email, quote }, config = { COMPANY_NAME, DRIVE_NAME, DRIVE_DATE, VENUE }) {
  const hi = escapeHtml(firstName(name));
  const q = cleanQuote(quote);
  const subject = `Welcome to ${config.DRIVE_NAME}, ${firstName(name)}!`;
  const quoteBlock = q
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #4f46e5;background:#eef2ff;color:#312e81;font-style:italic">“${escapeHtml(q)}”</blockquote>`
    : "";
  const body = [
    `<p>Hi ${hi},</p>`,
    `<p>You're registered for <b>${escapeHtml(config.DRIVE_NAME)}</b> at ${escapeHtml(config.COMPANY_NAME)}.</p>`,
    `<p><b>When:</b> ${escapeHtml(config.DRIVE_DATE)}<br><b>Where:</b> ${escapeHtml(config.VENUE)}</p>`,
    quoteBlock,
    `<p>Please keep this email handy on the day. We look forward to meeting you!</p>`,
    `<p>Team ${escapeHtml(config.COMPANY_NAME)}</p>`,
  ].filter(Boolean).join("\n");
  return { to: email, subject, body, kind: q ? "gmail_quote" : "basic" };
}

// The AI flow's answer, whatever shape viaSocket wraps it in: the first non-empty string found under
// a known key. Returns "" when nothing usable is there (the caller then sends the basic email).
const QUOTE_KEYS = ["quote", "content", "text", "response", "output", "message", "answer", "result", "data"];
export function extractQuote(payload, depth = 0) {
  if (typeof payload === "string") {
    const t = payload.trim();
    if (!t) return "";
    if (depth === 0 && /^[{[]/.test(t)) {
      try { return extractQuote(JSON.parse(t), 1); } catch { /* plain text that looks like JSON */ }
    }
    return t;
  }
  if (!payload || typeof payload !== "object" || depth > 4) return "";
  if (Array.isArray(payload)) {
    for (const item of payload) { const q = extractQuote(item, depth + 1); if (q) return q; }
    return "";
  }
  for (const k of QUOTE_KEYS) {
    if (k in payload) { const q = extractQuote(payload[k], depth + 1); if (q) return q; }
  }
  return "";
}
