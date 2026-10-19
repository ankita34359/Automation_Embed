import { test } from "node:test";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { openDb } from "./db.js";
import { createApp } from "./app.js";
import { createDispatcher } from "./outbound.js";
import { buildWelcomeEmail, extractQuote } from "./email.js";

// Random throwaway secrets, generated per run; nothing real and nothing written down.
const rnd = () => crypto.randomBytes(16).toString("hex");
const env = { SESSION_SECRET: rnd(), ADMIN_PASSWORD: rnd(), VIASOCKET_ORG_ID: "80141", VIASOCKET_PROJECT_ID: "projKcrymrh3", VIASOCKET_EMBED_SECRET: rnd(), VIASOCKET_UNIQUE_ID: "hiredrive-test" };

async function start(fetchImpl) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hd-"));
  const db = openDb(dir);
  const calls = [];
  const wrapped = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return fetchImpl(url, init); };
  const dispatch = createDispatcher(db, { fetchImpl: wrapped, log: { error() {} } });
  const app = createApp({ db, env, dispatch });
  const server = await new Promise((r) => { const s = app.listen(0, "127.0.0.1", () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = () => { server.closeAllConnections(); server.close(); db.close(); fs.rmSync(dir, { recursive: true, force: true }); };
  return { base, db, calls, close };
}
const post = (base, p, body, cookie) => fetch(base + p, { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
const settle = () => new Promise((r) => setTimeout(r, 150));
async function login(base) {
  const r = await post(base, "/api/admin/login", { password: env.ADMIN_PASSWORD });
  return r.headers.getSetCookie()[0].split(";")[0];
}
const okFetch = (out = { ok: true }) => async () => new Response(JSON.stringify(out), { status: 200 });
const flow = (slot, id = "scriTEST1") => ({ slot, id, action: "published", status: "active", title: slot, webhookurl: `https://flow.sokt.io/func/${id}`, payload: {} });

test("admin routes need a session; wrong password is refused; cookie is httpOnly + signed", async () => {
  const t = await start(okFetch());
  assert.equal((await fetch(t.base + "/api/admin/summary")).status, 401);
  assert.equal((await fetch(t.base + "/api/viasocket/token")).status, 401);
  assert.equal((await post(t.base, "/api/admin/login", { password: "nope" })).status, 401);
  const r = await post(t.base, "/api/admin/login", { password: env.ADMIN_PASSWORD });
  assert.equal(r.status, 200);
  const sc = r.headers.getSetCookie()[0];
  assert.match(sc, /HttpOnly/i);
  assert.match(sc, /SameSite=Lax/i);
  assert.match(sc, /hd_session=s%3A/); // signed
  const cookie = sc.split(";")[0];
  assert.equal((await fetch(t.base + "/api/admin/summary", { headers: { cookie } })).status, 200);
  assert.equal((await fetch(t.base + "/api/admin/summary", { headers: { cookie: cookie.replace(/.$/, "x") } })).status, 401); // tampered
  t.close();
});

test("token: three claims, HS256, unique_identifier from env", async () => {
  const t = await start(okFetch());
  const cookie = await login(t.base);
  const { token } = await (await fetch(t.base + "/api/viasocket/token", { headers: { cookie } })).json();
  const [h, p] = token.split(".").slice(0, 2).map((x) => JSON.parse(Buffer.from(x, "base64url")));
  assert.equal(h.alg, "HS256");
  assert.deepEqual(p, { org_id: "80141", project_id: "projKcrymrh3", unique_identifier: "hiredrive-test" });
  t.close();
});

test("flow route: slot/url validation, upsert, pause keeps, delete clears, stray ids ignored", async () => {
  const t = await start(okFetch());
  const cookie = await login(t.base);
  const f = (b) => post(t.base, "/api/viasocket/flow", b, cookie);
  assert.equal((await f({ ...flow("nope") })).status, 400);
  assert.equal((await f({ ...flow("sheet_other"), webhookurl: "https://evil.example/func/x" })).status, 400);
  assert.equal((await f(flow("sheet_other"))).status, 200);
  assert.equal((await f({ ...flow("sheet_other", "scriNEW"), action: "updated" })).status, 200);
  assert.equal(t.db.prepare("SELECT flow_id FROM integration_slots WHERE slot='sheet_other'").get().flow_id, "scriNEW");
  await f({ ...flow("sheet_other", "scriOLD"), action: "deleted" }); // different flow: ignored
  assert.equal(t.db.prepare("SELECT COUNT(*) n FROM integration_slots").get().n, 1);
  await f({ ...flow("sheet_other", "scriNEW"), action: "paused", status: "paused" });
  assert.equal(t.db.prepare("SELECT status FROM integration_slots WHERE slot='sheet_other'").get().status, "paused");
  const sum = await (await fetch(t.base + "/api/admin/summary", { headers: { cookie } })).json();
  assert.equal(sum.slots.find((s) => s.slot === "sheet_other").state, "paused");
  assert.ok(!JSON.stringify(sum).includes("flow.sokt.io"), "no webhook URL in the summary");
  await f({ ...flow("sheet_other", "scriNEW"), action: "deleted", status: "deleted" });
  assert.equal(t.db.prepare("SELECT COUNT(*) n FROM integration_slots").get().n, 0);
  t.close();
});

test("register: validation, duplicate 409, instant 201, nothing set up -> skipped_not_set_up", async () => {
  const t = await start(okFetch());
  assert.equal((await post(t.base, "/api/register", { name: "A", email: "x", phone: "1", college: "?" })).status, 400);
  const body = { name: "Asha Verma", email: "asha@example.com", phone: "9876543210", college: "IET" };
  const r = await post(t.base, "/api/register", body);
  assert.equal(r.status, 201);
  assert.equal((await post(t.base, "/api/register", { ...body, email: "ASHA@example.com" })).status, 409);
  await settle();
  const row = t.db.prepare("SELECT * FROM registrations").get();
  assert.equal(row.phone, "919876543210");
  assert.equal(row.sheet_status, "skipped_not_set_up");
  assert.equal(row.email_status, "skipped_not_set_up");
  assert.equal(t.calls.length, 0);
  t.close();
});

test("register: IET + Gmail -> IET sheet, AI quote, welcome email with the quote", async () => {
  const t = await start(async (url, init) => new Response(JSON.stringify(url.endsWith("scriAI") ? { content: "Ship small, learn fast." } : { ok: true }), { status: 200 }));
  const cookie = await login(t.base);
  for (const s of ["sheet_iet_davv", "sheet_other", "ai_quote", "welcome_email"]) await post(t.base, "/api/viasocket/flow", flow(s, "scri" + { sheet_iet_davv: "IET", sheet_other: "OTH", ai_quote: "AI", welcome_email: "MAIL" }[s]), cookie);
  assert.equal((await post(t.base, "/api/register", { name: "Asha Verma", email: "asha@gmail.com", phone: "9123456789", college: "IET" })).status, 201);
  await settle();
  const by = (suffix) => t.calls.find((c) => c.url.endsWith(suffix));
  assert.deepEqual(Object.keys(by("scriIET").body), ["registration_id", "name", "email", "phone", "college", "registered_at"]);
  assert.equal(by("scriIET").body.phone, "919123456789");
  assert.equal(by("scriOTH"), undefined);
  assert.deepEqual(by("scriAI").body, { name: "Asha Verma", college: "IET" });
  const mail = by("scriMAIL").body;
  assert.deepEqual(Object.keys(mail), ["to", "subject", "body"]);
  assert.match(mail.body, /Ship small, learn fast\./);
  const row = t.db.prepare("SELECT * FROM registrations").get();
  assert.deepEqual([row.sheet_status, row.email_status, row.email_kind], ["sent", "sent", "gmail_quote"]);
  t.close();
});

test("register: other college + non-Gmail -> other sheet, no AI call, basic email; failures and pauses are recorded", async () => {
  let fail = false;
  const t = await start(async () => (fail ? new Response("boom", { status: 500 }) : new Response("{}", { status: 200 })));
  const cookie = await login(t.base);
  for (const s of ["sheet_iet_davv", "sheet_other", "ai_quote", "welcome_email"]) await post(t.base, "/api/viasocket/flow", flow(s, "scri" + s), cookie);
  await post(t.base, "/api/register", { name: "Ravi", email: "ravi@notgmail.com", phone: "09876543210", college: "Other", college_other: "VIET" });
  await settle();
  assert.ok(t.calls.some((c) => c.url.endsWith("scrisheet_other")));
  assert.ok(!t.calls.some((c) => c.url.endsWith("scriai_quote")), "AI is only for Gmail addresses");
  let row = t.db.prepare("SELECT * FROM registrations WHERE email='ravi@notgmail.com'").get();
  assert.deepEqual([row.sheet_status, row.email_status, row.email_kind], ["sent", "sent", "basic"]);
  // AI fails -> basic email still goes out
  await post(t.base, "/api/viasocket/flow", { ...flow("welcome_email", "scriwelcome_email"), action: "paused", status: "paused" }, cookie);
  fail = true;
  await post(t.base, "/api/register", { name: "Meena", email: "meena@gmail.com", phone: "9876543211", college: "DAVV" });
  await settle();
  row = t.db.prepare("SELECT * FROM registrations WHERE email='meena@gmail.com'").get();
  assert.equal(row.sheet_status, "failed");
  assert.equal(row.email_status, "skipped_paused");
  assert.ok(!/flow\.sokt\.io/.test(row.sheet_error ?? ""));
  t.close();
});

test("email: subject/body, escaping, quote cleaning and extraction", () => {
  const m = buildWelcomeEmail({ name: "Asha <b>V</b>", email: "a@gmail.com", quote: '"Keep <script>shipping</script>."' });
  assert.equal(m.kind, "gmail_quote");
  assert.ok(!m.body.includes("<script>"));
  assert.ok(!m.body.includes("<b>V"));
  assert.equal(buildWelcomeEmail({ name: "Ravi K", email: "r@x.com" }).kind, "basic");
  assert.equal(extractQuote("  hello  "), "hello");
  assert.equal(extractQuote({ data: { content: "deep" } }), "deep");
  assert.equal(extractQuote({ content: "" }), "");
  assert.equal(extractQuote(null), "");
});
