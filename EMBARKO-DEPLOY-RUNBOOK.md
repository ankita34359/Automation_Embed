# Deploying a Node app to Embarko (runbook, from the HireDrive deploy)

Written for the Curevia project. Every secret is a placeholder: `<TOKEN>`, `<SECRET>`, `<PASSWORD>`. Nothing here contains a real value.

Facts below are marked **[used]** (I did it for HireDrive and saw the result), **[docs]** (from Embarko's own docs, not exercised by me) or **[not verified]**. Embarko's docs are the source of truth and change: `https://embarko.ai/docs` (append `.md` to a page for plain text, e.g. `https://embarko.ai/docs/deploy.md`).

HireDrive was a single Node process: Express serving a Vite/React build plus `/api`, SQLite on disk. If Curevia is a different shape, see "If Curevia is not like HireDrive" at the end.

---

## 0. Pre-flight checklist (do this before the first upload)

- [ ] `package.json` and `package-lock.json` are **committed** at the repo root.
- [ ] `scripts.start` runs the server; it listens on `process.env.PORT` and `0.0.0.0` (not `localhost`, not a fixed port).
- [ ] If there is a build step, `scripts.build` exists. Build tools (vite, tailwind, etc.) are in `dependencies`, not `devDependencies` (section 5.D).
- [ ] `engines.node` is set, and **every dependency's own `engines.node` accepts that range** (section 5.C). Test with the *same* Node major Embarko will use, not your sandbox's.
- [ ] Anything that must survive a redeploy is written under `process.env.DATA_DIR` (section 3).
- [ ] No `Dockerfile`. No `.env` committed. Secrets are read from env vars at runtime only.
- [ ] You have a deploy token (section 1) and an app name (section 2).

---

## 1. Getting the deploy token

**[used]**, following `https://embarko.ai/docs/claim.md`.

What the token is for: deploying over HTTP so the app goes straight into *your* account (**permanent, "claimed"**). Without a token, an HTTP deploy creates a temporary app that is deleted after 24 hours. The same token also authorises status, logs, env-vars, rollback and `GET /api/apps/<app>` for a claimed app (those answer 404/401 without it).

### Step 1: you give the agent the email you signed in to Embarko with
It must be that exact email. The agent should ask for it; it is not guessable.

### Step 2: the agent requests the token (once)
```bash
printf '{"email":"<YOUR_EMBARKO_EMAIL>"}' > body.json
curl -sS -X POST 'https://ship.embarko.ai/api/public/deploy-tokens/request' \
  -H 'Content-Type: application/json' --data @body.json
rm body.json
```
Reply is always **HTTP 202**, even for an unknown address (so it tells you nothing about validity):
```json
{"message":"If this email address is valid, a deploy token for each of your workspaces has been sent to it. Check the inbox (and spam folder). Each request creates a new token; your existing tokens keep working."}
```
Limits **[docs]**: 5 requests per email and 10 per IP per hour; the 202 comes back even when limited, so retrying tells you nothing. Tokens do not expire. Each request makes a new token; older ones keep working.

### Step 3: what you do
1. Open your inbox (check spam). One token arrives **per workspace**. Use the token from the workspace that should own the app. I only ever received one, so I can't say how multiple are labelled **[not verified]**.
2. Give the token to the agent. In the HireDrive session I pasted it in chat and the agent saved it. Safer: create the file yourself in the agent's environment so it never sits in chat history:
   ```bash
   mkdir -p ~/.embarko && chmod 700 ~/.embarko
   umask 077; printf '%s\n' '<TOKEN>' > ~/.embarko/credentials; chmod 600 ~/.embarko/credentials
   ```
   Or export `DEPLOY_TOKEN=<TOKEN>` for the session. Embarko's docs look for `DEPLOY_TOKEN` first, then line 1 of `~/.embarko/credentials`.
3. **You can reuse the HireDrive token for Curevia** if it is the same workspace. No new request needed. (A different Claude Code session is a different machine, so the file will not be there; provide it again.)
4. Never commit it; keep it out of the repo. The token in this chat history should be treated as exposed: rotate it when you can. I did not check where token revocation lives in the Embarko dashboard **[not verified]**.

### How the token is used
Always as a Bearer header. With curl:
```bash
curl -sS --oauth2-bearer "$(head -1 ~/.embarko/credentials)" <URL>
```
(Equivalent: `-H "Authorization: Bearer <TOKEN>"`. The script in the appendix passes it on stdin to curl so it never appears in the process list; I tested that mechanism with a dummy value.)

---

## 2. Packaging and uploading

**[used]**. Embarko wants a **`.tar.gz`** (not `.zip`) in the multipart field `source`.

### 2a. Pick the app name
- 3 to 63 chars, lowercase letters, digits and dashes, no leading/trailing dash; **unique across all of Embarko**; reserved names (`www`, `api`, `app`, `admin`, `docs`, `help`...) return `409 app_name_reserved` **[docs]**.
- It becomes the address `https://<app-name>.embarko.app`. Renaming later breaks the old URL (no redirect).
- You cannot check availability without a token (`GET /api/apps/<name>` returns 401 without one, and 404 for a name you don't own). Just deploy; a taken or reserved name is rejected. Suggested for Curevia: `curevia-<yourname>`.

### 2b. Commit, then package only tracked files
`git archive` ships exactly what is committed at `HEAD`, so `.env`, `node_modules`, `dist`, `data` and anything git-ignored cannot be included by accident. **Commit first.**
```bash
cd <repo-root>
git status --porcelain --untracked-files=no     # must print nothing
git archive --format=tar.gz -o /tmp/app.tar.gz HEAD -- . ':(exclude).claude' ':(exclude).env.example'
```
- I excluded `.claude/` (tool docs, not needed at runtime) and `.env.example` (Embarko's own example excludes `.env*`). Add more `':(exclude)<path>'` entries for anything not needed at runtime.
- Check the archive before sending:
  ```bash
  tar -tzf /tmp/app.tar.gz | sort
  tar -tzf /tmp/app.tar.gz | grep -E '(^|/)(\.env(\..*)?|node_modules|dist|data|\.git)(/|$)' || echo "none (good)"
  tar -tzf /tmp/app.tar.gz | grep -xE 'package(-lock)?\.json'      # both at the top level
  ```
- Embarko's own docs example uses plain `tar -czf` with `--exclude=node_modules --exclude=.git --exclude='.env*' --exclude=dist --exclude=.next --exclude=venv --exclude=.venv --exclude=__pycache__ --exclude='*.db'` if you are not using git.

### 2c. Upload
```bash
curl -sS -m 180 -w '\nHTTP %{http_code}\n' -X POST 'https://ship.embarko.ai/apps' \
  --oauth2-bearer "$(head -1 ~/.embarko/credentials)" \
  -H 'X-App-Name: <app-name>' \
  -H 'X-Agent-Name: claude-code' \
  -H "X-App-Version: $(git rev-parse --short HEAD)" \
  -F 'source=@/tmp/app.tar.gz'
```
Reply **HTTP 202** (this is what HireDrive returned, ids shortened):
```json
{"success":true,"status":"building","app":{"name":"<app-name>","kind":"service","claimed":true,"deploymentId":"<id>"},"next":"Building: poll ...","links":{"status":"https://ship.embarko.ai/apps/<app-name>/status","feedback":"..."}}
```
- **Check `"kind":"service"`** (a server app). If a server app comes back `"static"`, stop: Embarko treated it as a static site and will not run your server. (HireDrive got `service`. Embarko's docs say Vite/CRA single-page apps *without* a server are served as static sites.)
- **Check `"claimed":true`.** If false, the token was not accepted and the app is temporary (24 h).
- `X-Agent-Name` is just a label; `X-App-Version` shows in the deployments list.
- Do **not** use the connector's `deploy_app` for a real project: it needs every file's full text inside the call, which is slow and can corrupt a lockfile (section 5.A).

### 2d. Wait for the build
```bash
# poll until live / failed / crashed
for i in $(seq 1 60); do
  r=$(curl -sS -m 20 --oauth2-bearer "$(head -1 ~/.embarko/credentials)" https://ship.embarko.ai/apps/<app-name>/status)
  case "$r" in *'"status":"live"'*|*'"status":"failed"'*|*'"status":"crashed"'*) echo "$r"; break;; esac
  sleep 10
done
```
- A claimed app's status **needs the token** (the `links.status` URL in the deploy reply returns `404 Not found` without it). The HireDrive build took about 3.5 minutes (native module compile).
- Statuses **[docs]**: `building`, `starting` (keep waiting), `live` (final), `failed` (build failed: read logs), `crashed` (built but stopped: read stderr), `not_deployed`.
- Logs: `GET https://ship.embarko.ai/apps/<app-name>/logs?stream=stderr` (and `stream=stdout`) with the token. Last ~8 KB only. After a failed build you get the **build** log.

---

## 3. Config files and settings Embarko needed

**No `embarko.json`, no `Dockerfile`, no `.npmrc`.** All of it came from `package.json` and the code. (`embarko.json` is optional and only used for settings such as timed jobs: `https://embarko.ai/docs/embarko-json` **[docs, not used]**.)

Embarko builds with **Railpack 0.38** **[used, from the build log]**. For Node it ran, in order: `npm install` → `npm run build` → `npm run start`. The log said "No node package manager detected, using npm" and "Custom start command detected" (that is fine).

### `package.json` (the parts that matter)
```json
{
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "vite build",
    "start": "node server/index.js"
  },
  "dependencies": {
    "express": "^5.3.0",
    "better-sqlite3": "^12.11.1",
    "vite": "^8.3.4",
    "@vitejs/plugin-react": "^6.1.2",
    "tailwindcss": "^4.3.3",
    "@tailwindcss/vite": "^4.3.3"
  }
}
```
- **Node version**: Railpack took it from `engines.node`. `">=20"` gave **Node 20.20.2** (the log line: `node │ 20.20.2 │ package.json > engines > node (>=20)`), not the newest LTS. Declare what you can actually test (section 5.C).
- **Build tools in `dependencies`** (section 5.D).
- **`package-lock.json` committed** (the build log recommends it: "Add a `package-lock.json` for more deterministic installs").

### PORT
Set by Embarko at runtime (the HireDrive log showed `listening on 0.0.0.0:28277`). It **cannot be overridden**. Listen on it, on all interfaces:
```js
const port = Number(process.env.PORT) || 3001;   // 3001 only for local dev
app.listen(port, "0.0.0.0");
```

### DATA_DIR (the only persistent disk)
Everything outside `DATA_DIR` is wiped on every redeploy. `DATA_DIR` survives redeploys and restarts. It is set by Embarko and cannot be overridden. **[docs: https://embarko.ai/docs/data.md]**
```js
const dir = process.env.DATA_DIR || "./data";         // ./data only for local dev
fs.mkdirSync(dir, { recursive: true });               // create it on startup
const db = new Database(path.join(dir, "app.db"));    // SQLite file (and its -wal/-shm) live here
```
- Embarko keeps two bookkeeping tables in every SQLite file there, `_litestream_seq` and `_litestream_lock`. Leave them alone. Do **not** use an ORM or migration tool that diffs the live schema and drops "unknown" tables; use plain `CREATE TABLE IF NOT EXISTS` or committed migration files.
- **Data is not backed up** (Embarko says so). Keep your own export (HireDrive has a CSV export route).
- Local default `./data` should be git-ignored. HireDrive's startup log does **not** print the DB path, so I could not confirm it from logs; I recommend logging it at startup.

### Other limits **[docs]**
One upload = one app = one process; 256 MB RAM; no WebSockets (use HTTP/polling); frontend and backend in one process, or two separate apps. Values a **frontend build** reads (`VITE_*`) cannot come from env vars (the `.env` is not uploaded and env vars are runtime only): put public values in a committed config file (HireDrive uses `src/config.js`) and never put secrets in frontend code.

---

## 4. Environment variables / secrets

**[used]** via the dashboard; the HTTP/connector routes below are **[docs, not used by me]**.

### What I did for HireDrive
1. Got the project id (needs the token):
   ```bash
   curl -sS --oauth2-bearer "$(head -1 ~/.embarko/credentials)" https://ship.embarko.ai/api/apps/<app-name>
   # -> {"id":"<PROJECT_ID>","name":"<app-name>","memoryMb":256,...}
   ```
2. Gave the user this page (no reply contains it ready-made; you build it from the id):
   `https://embarko.ai/app/projects/<PROJECT_ID>/environment`
   (also reachable as embarko.ai/app → the app → **App setup**).
3. **The user typed every value there themselves**, so no secret ever went through chat or the repo. Variables used: `ADMIN_PASSWORD=<PASSWORD>`, `SESSION_SECRET=<SECRET>`, `VIASOCKET_EMBED_SECRET=<SECRET>`, `VIASOCKET_UNIQUE_ID`, `VIASOCKET_ORG_ID`, `VIASOCKET_PROJECT_ID`, `NODE_ENV=production`.
4. The user clicked **"Apply changes"**. That **restarts the app with the new values: no re-upload and no rebuild** (it appeared in the deployments list as a new version, `re-deploy`, source `dashboard`, same code version).
5. The agent verified, read-only: variable **names** are listable, values never readable. The startup log lost its "Missing environment variables" warning, and routes that returned 503 started returning 401.

### Saving is not applying
A saved value does **not** reach the running app until it is applied (button, or API `apply: true`, or the next deploy). Values are **runtime only**: they are not available during `npm run build`.

### Ordering
If the code that reads a variable is not deployed yet: save the value first, then deploy (a deploy picks up stored values). If the code is already live: save and apply.

### Over HTTP **[docs]** (alternative to the dashboard)
```bash
# merges: keys you leave out are untouched. Put values in body.json yourself; never in chat.
curl -sS -X PUT 'https://ship.embarko.ai/api/apps/<app-name>/env-vars' \
  --oauth2-bearer "$(head -1 ~/.embarko/credentials)" -H 'X-Agent-Name: claude-code' \
  -H 'Content-Type: application/json' --data @body.json
# body.json: {"vars":[{"key":"SOME_KEY","value":"<SECRET>"}],"apply":true}
# one key:   PUT /api/apps/<app>/env-vars/<KEY>   {"value":"<SECRET>","apply":true}
# apply stored values: POST /api/apps/<app>/env-vars/apply
```
Keys match `^[A-Za-z_][A-Za-z0-9_]*$`. `PORT`, `APP_NAME`, `APP_VERSION`, `DATA_DIR` (and `CRON_SECRET` for apps with schedules) are set by Embarko and cannot be overridden. Static sites have no env vars. Connector equivalent: `update_app` with `set_env_vars` / `apply_env_vars`.

### App design tip that saved time
HireDrive starts even when secrets are missing: public pages work, admin routes answer `503 Server is missing: <NAMES>` (names only) until the variables are set, and a warning with the missing names is logged. That made "secrets not applied yet" obvious from the outside.

---

## 5. Every error we hit, and the fix

### A. Connector `deploy_app` is the wrong tool for a real project
It needs the **full text of every file inside the tool call**. Fine for a few small files; for a ~98 KB `package-lock.json` plus sources it is slow and any typo can corrupt the lockfile. I first used it without the lockfile (next item) and then stopped.
**Fix:** use the HTTP upload with a `.tar.gz` and the token (section 2). Exact bytes, no retyping.

### B. First build failed at `npm install`
```
npm error Cannot read properties of null (reading 'edgesOut')
ERRO failed to solve: process "npm install" did not complete successfully: exit code: 1
```
(The log also had a stray `open /srv/embarko/docker/tmp/.../repositories: no such file or directory`, which I treated as noise.) The upload had **no `package-lock.json`**, and the Railpack log recommended one.
**Honest status:** I could **not** reproduce this locally (npm 10.8.2 and 10.9.4, with `production` true/false, with a pre-created `node_modules/.cache`, with and without a lockfile). The next deploy changed several things at once (lockfile included, `better-sqlite3` downgraded, build tools moved to `dependencies`), and it built, so I can't prove which change cured it. **Always ship the lockfile**; that is the documented, deterministic path.

### C. A dependency needed a newer Node than the host used (found *before* it failed at runtime)
Embarko built on **Node 20.20.2** (from `engines >= 20`). My sandbox ran **Node 22**, which hid the problem. Reading the lockfile showed:
- `better-sqlite3@13.0.3` → `engines.node: ">=22"`
- `concurrently@10` → `>=22` (dev-only, but it printed an `EBADENGINE` warning on Node 20)

**Fix:** `better-sqlite3@^12.11.1` (supports Node 20 to 26) and `concurrently@^9`. Then proved it on the real runtime version:
```bash
mkdir -p /tmp/n20 && cd /tmp/n20 && npm init -y >/dev/null && npm i node@20.20.2      # a real Node 20 binary
cd <copy-of-repo-without-node_modules>
export PATH=/tmp/n20/node_modules/node/bin:$PATH && node -v                          # v20.20.2
npm ci && npm run build && npm test                                                  # all must pass
```
**Rule:** check every dependency's `engines.node` against your declared range, and test under the *minimum* Node you declare. Quick scan of a lockfile for packages that need only newer Node:
```bash
node -e 'const l=require("./package-lock.json");console.log(Object.entries(l.packages).filter(([k,v])=>v.engines&&v.engines.node&&/>=\s*22/.test(v.engines.node)&&!/20/.test(v.engines.node)).map(([k,v])=>k+" "+v.engines.node))'
```

### D. Build tools in `devDependencies`
The build log printed `npm warn config production Use --omit=dev instead`, which can mean the builder installs without devDependencies, in which case `vite build` would fail with "vite not found".
**Fix:** move `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite` (whatever `npm run build` needs) to `dependencies`, then regenerate the lockfile (`npm install --package-lock-only`). **Proved** with a production-style install on Node 20.20.2:
```bash
npm ci --omit=dev && ls node_modules/.bin/vite && npm run build
```
**Honest nuance:** npm prints that warning whenever the `production` setting exists at all, even when it is `false`, so I never proved the builder actually omits devDependencies. The change is harmless belt-and-braces, so I kept it.

### E. Status link returned 404 for a claimed app
`links.status` in the deploy reply (`https://ship.embarko.ai/apps/<app>/status`) answers `404 {"error":"Not found"...}` **unless the Bearer token is sent**. Same for logs and `GET /api/apps/<app>`. It is not a failed deploy.
**Fix:** always send the token on status/logs, or use the connector's `read_app`.

### F. Admin routes returned 503 right after the first successful deploy
Expected: the secrets were not set yet. `{"error":"Server is missing: SESSION_SECRET"}`. After the user set the variables and clicked Apply, the same routes returned `401 Please sign in`.

### G. Connector disconnected mid-session
The Embarko connector dropped out and later needed re-authorising. The HTTP API with the token covers status, logs, env-vars, deployments and rollback, so keep the token handy as a fallback.

### Documented, did not happen to us
- `409 app_name_reserved`: pick another name.
- `401 unauthorized` on upload: wrong or revoked token; ask for the whole token again.
- Zip upload: only `.tar.gz` works for the HTTP route.
- A schema-sync tool refusing to start or dropping `_litestream_*` tables (section 3).
- `422 no_rollback_target` / `rollback_image_unavailable` (section 6).

---

## 6. Redeploying after a code change, and undoing one

**[used]** for deploy/redeploy; rollback is **[docs]**.

1. Edit, test locally, **commit** (and push if you use GitHub; the archive is built from your local `HEAD`).
2. Re-run the same package + upload (2b, 2c) with the **same `X-App-Name`**. It updates the same app at the same URL. Use a new `X-App-Version` (the short git SHA).
3. Poll until `live` (2d). On `failed`/`crashed`, read `logs?stream=stderr`, fix, commit, redeploy.
4. **Env vars and `DATA_DIR` are kept across redeploys.** You do not need to re-enter secrets or re-apply them unless you changed them. Everything else on disk is replaced.
5. Smoke-test the live site:
   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' https://<app-name>.embarko.app/
   curl -sS -D - -o /dev/null https://<app-name>.embarko.app/ | grep -i content-security-policy
   ```
   Embarko injects a Content-Security-Policy on every response: `default-src 'self'` with `https: *` allowed for scripts, styles, images, fonts, connections, media and frames, `object-src 'none'`. A third-party script or iframe over https works; I verified `embed.viasocket.com` (script) and `embedfrontend.viasocket.com` (frame) in a real Chromium against it.
6. **Roll back** a bad update (no rebuild; env vars and domains stay; `DATA_DIR` is *not* rolled back, so older code runs against today's data; only the last 5 builds are kept) **[docs]**:
   ```bash
   curl -sS -X POST 'https://ship.embarko.ai/api/apps/<app-name>/rollback' \
     --oauth2-bearer "$(head -1 ~/.embarko/credentials)" -H 'X-Agent-Name: claude-code' \
     -H 'Content-Type: application/json' -d '{}'          # or {"deploymentId":"<id>"}
   # list candidates (rollbackTarget:true): GET /api/apps/<app-name>/deployments
   ```
   Connector equivalent: `update_app` with `rollback`.

---

## If Curevia is not like HireDrive **[docs]**
- **Pure static / Vite or CRA single-page app, no server:** send the project with its `package.json` and build script (not a built `dist/`). Embarko builds it and serves the output as a website: no start script, no env vars, no `DATA_DIR`. Deep links like `/products` load the app.
- **Frontend + backend as separate processes:** two separate Embarko apps (`https://embarko.ai/docs/two-apps`).
- **Python / Go / Ruby / PHP / Rust / Java:** same upload; the app must bind `0.0.0.0:$PORT`; see `https://embarko.ai/docs/deploy.md` for each language's start rules.
- **Next.js:** `next start` reads `PORT` itself; do not add `-H localhost`.

---

## Appendix: one-command redeploy script

Save as `scripts/embarko-deploy.sh` in the project, `chmod +x`. Usage: `scripts/embarko-deploy.sh <app-name>`, or `DRY_RUN=1 scripts/embarko-deploy.sh <app-name>` to build and check the archive without uploading.

**Tested:** syntax check; a dry run on the HireDrive repo (32 files, 56 KB); it refuses a committed `.env`, a dirty tree and a missing token; the stdin token mechanism returned the server's 401 for a dummy value. **Not run as a script:** the real upload and poll (I ran the same curl commands by hand).

```bash
#!/usr/bin/env bash
# Package the committed files and deploy them to Embarko.
#   scripts/embarko-deploy.sh <app-name>            deploy HEAD
#   DRY_RUN=1 scripts/embarko-deploy.sh <app-name>  build + check the archive, upload nothing
# Token: $DEPLOY_TOKEN, else line 1 of ~/.embarko/credentials. It is never printed.
set -euo pipefail

APP="${1:?usage: $0 <app-name>}"
API="https://ship.embarko.ai"
TOKEN="${DEPLOY_TOKEN:-$(head -1 "$HOME/.embarko/credentials" 2>/dev/null || true)}"
[ -n "$TOKEN" ] || [ "${DRY_RUN:-}" = 1 ] || { echo "No token: set DEPLOY_TOKEN or put it on line 1 of ~/.embarko/credentials" >&2; exit 1; }

# The token goes to curl on stdin, so it never appears in the process list.
ecurl() { printf 'oauth2-bearer = "%s"\n' "$TOKEN" | curl -sS -K - "$@"; }

cd "$(git rev-parse --show-toplevel)"
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "Uncommitted changes: commit first (git archive ships HEAD only)." >&2; exit 1; }
VERSION="$(git rev-parse --short HEAD)"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
# Tracked files only. Add ':(exclude)<path>' for anything else the app does not need at runtime.
git archive --format=tar.gz -o "$TMP/app.tar.gz" HEAD -- . ':(exclude).claude' ':(exclude).env.example'

LIST="$(tar -tzf "$TMP/app.tar.gz")"
if echo "$LIST" | grep -E '(^|/)\.env(\..*)?$|(^|/)node_modules/|^dist/|^data/|(^|/)\.git/'; then
  echo "Refusing to upload: forbidden file(s) above are in the archive." >&2; exit 1
fi
echo "$LIST" | grep -qx 'package.json'      || { echo "package.json is not at the archive root." >&2; exit 1; }
echo "$LIST" | grep -qx 'package-lock.json' || echo "WARNING: no package-lock.json in the archive (installs are less reliable)." >&2
echo "Archive: $(echo "$LIST" | grep -vc '/$') files, $(du -h "$TMP/app.tar.gz" | cut -f1), version $VERSION"
[ "${DRY_RUN:-}" = 1 ] && { echo "$LIST"; echo "DRY_RUN: nothing uploaded."; exit 0; }

echo "Uploading to $API/apps as $APP ..."
ecurl -m 180 -w '\nHTTP %{http_code}\n' -X POST "$API/apps" \
  -H "X-App-Name: $APP" -H 'X-Agent-Name: claude-code' -H "X-App-Version: $VERSION" \
  -F "source=@$TMP/app.tar.gz"

echo "Waiting for the build ..."
for _ in $(seq 1 60); do
  R="$(ecurl -m 20 "$API/apps/$APP/status" || true)"
  S="$(echo "$R" | grep -o '"status":"[a-z_]*"' | head -1 | cut -d'"' -f4)"
  case "$S" in
    live)    echo "$R"; exit 0 ;;
    failed|crashed|not_deployed)
             echo "$R"; echo "--- logs:"; ecurl -m 20 "$API/apps/$APP/logs?stream=stderr" | head -c 4000; echo; exit 1 ;;
  esac
  sleep 10
done
echo "Still not final after 10 minutes: check $API/apps/$APP/status" >&2; exit 1
```
