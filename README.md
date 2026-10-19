# HireDrive

Registration for one company's hiring drive (about 1,000 candidates). Candidates fill a public form on their phones and never connect an app. One HR admin signs in with a password, connects Google Sheets and Gmail inside viaSocket's prebuilt UI, and sees every registration.

**The rules live in our code** (`server/rules.js`). viaSocket is only the integration layer: it holds the Google sign-ins and runs four small one-action flows. Nothing in this app talks to Google directly.

## How it works

```
Candidate ──POST /api/register──▶ validate ▶ save in SQLite ▶ reply 201 immediately
                                                   │ (after the reply)
                      ┌────────────────────────────┴───────────────────────────┐
                      ▼                                                        ▼
   IET/DAVV? ─yes▶ flow: sheet_iet_davv               Gmail address? ─yes▶ flow: ai_quote ▶ quote
             └─no─▶ flow: sheet_other                                       │ (no / failed / empty: no quote)
                      │                                                    ▼
              sheet_status saved                      our code writes subject + HTML body ▶ flow: welcome_email
                                                                          │
                                                                  email_status saved
```

The four **slots** are flows the HR admin sets up once on **/admin/integrations**. Each slot is one action, opened by our code (not picked by the admin):

| slot | app / action | we send (dummy payload while setting up) |
|---|---|---|
| `sheet_iet_davv` | Google Sheets: Add New Row to Sheet | `registration_id, name, email, phone, college, registered_at` |
| `sheet_other` | Google Sheets: Add New Row to Sheet | same |
| `ai_quote` | viaSocket AI: Run AI Model (no sign-in) | `name, college` |
| `welcome_email` | Gmail: Send Email | `to, subject, body` (HTML) |

Who supplies what: **our code** picks the action for each slot and fills the per-registration values (the payload fields above) on every call; **the HR admin** chooses, once, in viaSocket's pickers: the Google account, the spreadsheet and tab, the column mapping, the Gmail "From", and the AI prompt wording. Candidates supply only the form fields.

The admin publishes a flow in a modal; the browser receives viaSocket's `flow` event and forwards it to `POST /api/viasocket/flow`, which stores one row per slot (flow id, title, status, run URL, payload). **Run URLs never go to the browser** (the summary route leaves them out). Pausing a slot keeps it and marks it paused; deleting clears it. Events for a different flow id than the slot's live one (for example an abandoned draft) are ignored.

Sends use a 20 s timeout and no automatic retries. Each registration stores `sheet_status` and `email_status`: `sent`, `failed`, `skipped_not_set_up`, `skipped_paused` (or `pending` while in flight; a restart marks anything still pending as `failed`). If the AI call fails or returns nothing, the basic email is sent instead.

## The rules (`server/rules.js`, tested in `server/rules.test.js`)

- **`normalizePhone(raw)`**: keep digits, drop one leading `0`; 10 digits become `91` + digits; 12 digits starting `91` stay; anything else is invalid ("Enter a 10-digit mobile number"). It deliberately does not rely on `startsWith("91")`: `9123456789` is a valid 10-digit number that happens to start with 91.
- **`collegeGroup(college)`**: `IET_DAVV` if the dropdown value is IET or DAVV, or typed text contains the whole word IET or DAVV (case-insensitive; `VIET` does not match); otherwise `OTHER`.
- **`isGmail(email)`**: the lowercased text after the last `@` must equal `gmail.com` exactly.

**Why the exact Gmail match.** `endsWith("gmail.com")` or `includes("gmail")` would also accept `x@notgmail.com` or `x@gmail.com.evil.com`, and those candidates would get the Gmail-only AI quote email. Exact match is the only safe reading of "email domain is gmail.com". The trade-off: `googlemail.com` (a real Google alias) gets the basic email. Change `isGmail` in one place if you want it counted.

Emails are stored lowercase and are unique, so `Asha@Gmail.com` and `asha@gmail.com` are the same candidate (409).

## Routes

| route | auth | what |
|---|---|---|
| `POST /api/admin/login` | public | `{ password }`, timing-safe compare; sets an httpOnly, sameSite=lax signed cookie (secure in production), 8 h. Slowed after repeated wrong guesses. |
| `POST /api/admin/logout` | public | clears the cookie |
| `GET /api/viasocket/token` | admin | HS256 JWT `{ org_id, project_id, unique_identifier }`, no `exp`; `unique_identifier` is `VIASOCKET_UNIQUE_ID`, never from the request |
| `POST /api/viasocket/flow` | admin | save the flow event for a slot (slot must be one of the 4; URL must start `https://flow.sokt.io/func/`) |
| `GET /api/admin/summary` | admin | slot states (no run URLs), counts, newest 500 registrations |
| `GET /api/admin/registrations.csv` | admin | every registration (cells that start with `= + - @` are neutralised) |
| `POST /api/register` | public | validate, save, reply 201, then send in the background. 400 field errors, 409 duplicate email |

Everything else under `/api` is a 404; other paths serve the React app from `dist/`.

## Environment variables (`.env`, names in `.env.example`)

| name | |
|---|---|
| `VIASOCKET_ORG_ID`, `VIASOCKET_PROJECT_ID` | `80141`, `projKcrymrh3` (public ids) |
| `VIASOCKET_EMBED_SECRET` | signs embed tokens. Secret. Server only. |
| `VIASOCKET_UNIQUE_ID` | HR admin's stable viaSocket identity: `hiredrive-hr-admin-local` locally, `hiredrive-hr-admin` on Embarko. Never change it after HR connects apps, or they appear to lose them. |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | HR login; cookie signing key |
| `PORT` (host sets it; defaults to 3001), `DATA_DIR` (default `./data`), `NODE_ENV=production` on the host | |

If an admin variable is missing, the server still starts and takes registrations; the admin routes answer 503 and the log names what is missing.

## Run it

```bash
npm install
cp .env.example .env     # then type the secrets yourself
npm run dev              # Vite on :5173 (proxies /api to the server on :3001)
npm test                 # rules, routes, email builder, viaSocket id check
npm run build && npm start
```

Company details (name, drive, date, venue) are placeholders in `src/config.js`. They appear on the form and in the emails.

Embarko: one process, `npm run build` then `npm start`, listening on `PORT` at `0.0.0.0`; the SQLite file is `DATA_DIR/hiredrive.db`.

## Things to know

- **Gmail sending limits.** A personal Gmail account can send roughly 500 messages a day (about 2,000 for Google Workspace). A drive of ~1,000 welcome emails needs a Workspace sender, or some emails will show `failed`.
- A registration is never lost to an integration problem: it is saved first, and failures only change the status columns. There is no automatic retry by design.
- `viasocket-check.mjs` (not committed) is viaSocket's id checker; `npm test` runs it when the file is present and the network allows.
