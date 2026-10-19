---
name: viasocket-apps
description: >-
  Integrate Google Sheets into this product through the viaSocket Apps API: render a connect
  button, capture the user's connection, populate pickers with their real data, run
  Google Sheets actions from the backend, and subscribe to Google Sheets events. Use whenever the
  task involves connecting a third-party app for an end user, reading the choices a field
  accepts, running an action in that app, or receiving its events.
---

# Google Sheets via the viaSocket Apps API

> Source: https://flow.viasocket.com/documentation/rowqm5xi2.md?format=http. Public, no sign-in. Fetch it again for the
> latest version of this file; it is generated from the live catalog.
> Part of viaSocket. Start at the skill, https://flow.viasocket.com/documentation/skill.md — setup, every capability, the rules. Every document: https://flow.viasocket.com/documentation/index.md.

viaSocket owns the integration with the app. Your code never talks to the app, never holds
its credentials and never refreshes its tokens — you make the five calls below and we do
that part. Your user authorises through the app’s own consent screen.

What that buys you, concretely:

- **Credentials you never see.** Each user’s Google Sheets tokens live encrypted in viaSocket’s vault and are
  refreshed there; a leak of your database leaks no third-party access.
- **One contract for Google Sheets and 2,300 other apps.** The same five calls, the same `{ label, value }` options,
  the same event handler shape, whichever app the user connects next.
- **Triggers done for you.** Polling where the app has no webhooks, de-duplication, renewal, delivery.
- **A runtime for your logic, not just a proxy.** An event handler is JavaScript we run in an isolated
  sandbox per event, with every app this user connected one `fetch` away and no secret in the code. So
  "when X, do Y" needs no server of yours, no deploy and nothing public, and `update-subscribed-event`
  swaps a live handler in place rather than shipping a release.
- **Real data for pickers.** `list-options` returns the user’s own channels, sheets and boards,
  searchable where the app’s list is large.
- **This file is generated from the live catalog.** Every id and field is current; refetch it rather than
  trusting a copy.

This file calls the HTTP API directly, through one small client you write yourself (below).
Any language works; the examples are JavaScript.

## What you are building

1. A **connect button** in your UI — Google Sheets's icon and name on it — that opens Google Sheets's consent screen and gives you an `auth_id`.
2. **Pickers** in your UI filled with the user's real Google Sheets data, one call per field.
3. **Actions** — enable the app once for a `script_id`, then run them from your backend.
4. **Events** — when something happens in the app, a short handler of yours runs on our
   servers: it runs an action in another app, calls your API, or both. Your server is not in the path.
5. **Whole automations** — a trigger and ordered JavaScript steps across Google Sheets and the user's other apps,
   written by your code or your coding agent and run on our VM, with nothing hosted on your side; the
   same flows the prebuilt UI builds. Its three calls and the step shape: https://flow.viasocket.com/documentation/automations.md
   They take each action’s `action_id` and each trigger’s `trigger_id`, printed under it below — not its version id.
6. **An assistant in your UI** — a chat we run for each of your users: threads and history kept, your
   prompt, your own endpoints as its tools (one of them can run a Google Sheets action from Step 3, so the
   assistant acts in the user's Google Sheets). https://flow.viasocket.com/documentation/ai.md

> Enabling is only for actions. A trigger subscription needs the `auth_id` and nothing
> else, so an integration that only listens for events never calls `/embed/enable`.

## Finished when

An integration is finished when every line below is **decided for this use case and the report to
the developer says how**. Nothing here says what to build; it says what must not be left undecided.
"Integrate Google Sheets" covers all of it for the actions and events in play, whether or not the
developer named each one.

- **Who connects.** Your own user, with a Connect button carrying Google Sheets's icon and the `auth_id` stored per user. In a two-sided product your customer connects, never their visitor.
- **Where each value comes from.** Every value a sample below writes as `<…>` — a field marked "list-options",
  or a choice between fixed values with no `default` — has one source, chosen for the use case and named in the
  report: fixed by you in code, only when one value serves every user of the product; chosen by your user once,
  on screen — a picker filled from their account, or a choice between the fixed values; or filled per run by your
  assistant, as a tool parameter. A value that depends on the user’s own account — their workspace, personal or
  shared, admin or not — is the user’s to choose, never fixed and never the first value because it came first.
  A free-text box for an id is a fourth choice, and one that needs a reason.
- **Every row of the table.** Each field of an action’s or trigger’s table is in the product — shown to the user with its
  `what it is` text as label and hint, or fixed in code with the reason in the report. A `required: yes` row
  is never dropped because its key looks technical; a boolean whose key says nothing is still a question
  the user answers.
- **Who picks the action.** You, in code; your user, from a list; or your assistant, from tool
  definitions — each one an action's schema below with the fixed fields removed. With the prebuilt UI's
  `chatbot: true` your user decides per flow which actions the assistant may use and which fields it fills.
- **Where it runs.** Actions from your backend on the app’s `script_id`; events through a `code`
  handler on viaSocket, with the subscription record saved. The browser never holds a `script_id`.
- **Proof.** `viasocket-check.mjs` (under "Prove it before you report") ran and its output is in the report; one real call
  was made and its actual response is there too; with a browser at hand, the Connect popup was opened and showed
  Google Sheets by name.

## Rules that are not negotiable

1. **The signing secret and the embed token are server-side only.** Sign the token on your
   backend; hand the frontend only what one popup needs.
2. **A `script_id` is a credential.** Anyone holding it can run that app as that user.
   Store it like a password and never ship it to the browser.
3. **Ids are fetched, never guessed.** Repository ids, channel ids, sheet ids — every one
   comes from `POST /embed/list-options`. A hardcoded id fails confusingly, not clearly.
4. **`existingFields` is not optional when a field depends on another.** Options are scoped
   by it; `{}` for a dependent field returns nothing useful.
5. **A nested key is addressed by its whole path.** `inputData` nests — `{ destination: {
   channel_id } }` — and the API addresses that field as `destination.channel_id`. So
   `fieldKey` is the **full dotted path**, never the leaf, and `existingFields` carries the
   value **nested exactly as inputData does**, never flattened:

   ```json
   { "fieldKey": "destination.thread_ts",
     "existingFields": { "destination": { "thread_channel_id": "C082WLRJLAA" } } }
   ```

   A leaf `fieldKey`, or a flat `"destination.thread_channel_id"` key in `existingFields`,
   matches no field: the call succeeds and returns nothing. Every field table below writes
   its keys in this full form, and the `inputData` sample beside each one shows the object
   those paths nest into. **Keys are case-sensitive and differ between actions of this app**
   (Google Sheets: `spreadsheet_Id` in one action, `spreadSheet_id` in another, `spreadsheet_id` in
   a third). A key from another action matches nothing, silently. Copy each key from the table
   of the action you are calling, character for character; never type one from memory. The
   parameter that carries it is `fieldKey` — not `blockKey`, not `field`.
6. **Normalise the list-options response.** Some fields wrap their list under `data.data`
   (with an `offset` you ignore); a plain field returns the array as `data`. Items are always
   `{ label, value }` — show the label, send the value. One helper, both shapes, no paging.
   A connection that cannot be read (revoked, or another user's `auth_id`) is answered with **200 and `success: true`**, the failure nested as `data.response.status` 400 and `data.response.data.message`. Treat that as the error it is; never render it as an empty list.
   A field marked **searchable** (`enableSearchApi` in the schema) takes what the user typed as
   `existingFields._searchText`, inside existingFields next to the dependency values. The field
   tables mark it.
7. **One `unique_identifier` per end user, forever.** Connections and subscriptions are
   isolated by it. Change it and the user appears to have lost their connection.
8. **A field of type `object` is not a single choice.** Fetch it like any other field —
   the response is the same `{ label, value }` list — then use *every* option’s `value` as a
   key, **verbatim**, and supply a value for each: `{ "<option value>": "<your value>" }`. The
   value is opaque: `name@longtext` is the whole key, however much it looks like a name plus a
   type. Never send the label, a lowercased label, or the value with a suffix removed.
9. **Enable only when you need actions, and never twice.** Subscribing to an event needs
   the connection and nothing more. Before enabling, look the flows up (see “Managing what
   a user already has”) — the `script_id` you want may already exist.
10. **A subscription needs a handler: `code`, a string of JavaScript we run on viaSocket’s
    servers each time the event fires.** It is what makes “when X happens in this app, do Y”
    work with no server of yours in the path. In scope there: `axios`, `fetch`, and `context`;
    the event is `context.req.body`. It stands alone: no `import`/`require`, nothing from this
    codebase; anything of yours it needs (a `script_id`, a picked id, an API key) is baked into
    the string when you subscribe. `webhook` is the edge case, not the default: pass it only
    when the product wants raw events pushed to a public endpoint of its own. Never both.
11. **Two ids, and the call names which.** The version id runs an action, lists options and
    subscribes; the `action_id` / `trigger_id` is for the connect popup, automations and the prebuilt UI. Both are
    printed under every action and trigger below.
12. **The `service_id` is `rowqm5xi2`, used exactly so.** Never Google Sheets's name or slug in its place, never
    the id with a name joined on (`rowqm5xi2_googlesheets`); an `auth_id` is one opaque value, passed whole.

**Two ids per action and trigger, and they look alike.** Every action has an `action_id` and an
`action_version_id`; every trigger a `trigger_id` and a `trigger_version_id`. Both are `row…` strings
and nothing tells them apart by eye. The catalog API and every app’s document name each one as the
call that takes it, so copy same-name to same-name and never the other.

| The call | Takes |
| --- | --- |
| Run an action, `list-options`, `subscribe-event` | `action_version_id` / `trigger_version_id` |
| An automation’s `trigger_id` and each step’s `action_id`; the prebuilt UI’s `open: { actionId }` / `{ triggerId }` and `filteredServices`; the connect popup’s `filteredActions` | `action_id` / `trigger_id` |

**A `service_id` is used exactly as returned.** It is the bare `row…` string the search, the app
list (`rowid`) and the catalog (`service.service_id`) give — `rowo0bqrhj5g` for Gmail, `rowbu58rc`
for Slack. Never build one: not the app’s name or slug (`gmail`), not the id with a name joined on
(`rowbu58rc_gmail`), not an id read off another value. An `auth_id` does end in `_<service_id>`
(`auth2FvZLyE0_rowo0bqrhj5g`); that is one opaque value — pass it whole, never split it, never
compose one. The popup, the enable call and the prebuilt UI reject anything else, some of them
silently: an unknown app, a blank screen, a 400.

## A test connection, while building

Running an action, fetching a trigger’s real event and proving the token all need a connection, and
only a person can make one: the app’s sign-in runs in a browser. Ask the developer once, early, and
read the `auth_id` back yourself; never ask them to paste ids.

1. Tell the developer: “Open https://flow.viasocket.com/integrations/80141/projKcrymrh3/apps-api, choose Google Sheets, click
   Connect and sign in with a test account. Tell me when it shows an `auth_id`.” That page connects as the
   test user `apps-api-test-user` — the identifier shown at the top of it.
2. Sign an embed token for `unique_identifier` `apps-api-test-user` and call `GET https://flow-api.viasocket.com/embed/authentications`
   with it. The entry whose `id` ends in `_<service_id>` is that app’s connection, and its `id` is the `auth_id`.
3. With it: enable the app once for a `script_id`; run the action once against a test target (a test channel, a
   test sheet) and keep its real response — that, not the sample printed under the action, is what a later step
   maps from; fetch a trigger’s real event with the sample call.

The test connection is for building. Its `auth_id` and `script_id` never go into the product’s code or config;
the product’s users make their own through its Connect button.

## Environment

```bash
# Your org signing secret, from the viaSocket Setup page. Backend only.
VIASOCKET_EMBED_SECRET=...

# Fixed for this integration.
VIASOCKET_ORG_ID=80141
VIASOCKET_PROJECT_ID=projKcrymrh3
VIASOCKET_API_URL=https://flow-api.viasocket.com
VIASOCKET_RUN_URL=https://flow.sokt.io
VIASOCKET_SERVICE_ID=rowqm5xi2   # Google Sheets
```

## Calling it

One server-side module, no dependency beyond a JWT library. Every call except the connect popup goes through it,
and every example further down uses these function names.

```js
import jwt from 'jsonwebtoken'

const API = process.env.VIASOCKET_API_URL
const RUN = process.env.VIASOCKET_RUN_URL

/**
 * uniqueIdentifier is YOUR stable id for the signed-in end user (a user id, an email hash).
 * It is not a token: it becomes the unique_identifier claim of the embed token this signs.
 * Sign on demand, per request, on the server; never cache it in the browser.
 */
export function embedToken(uniqueIdentifier) {
  return jwt.sign(
    {
      org_id: process.env.VIASOCKET_ORG_ID,
      project_id: process.env.VIASOCKET_PROJECT_ID,
      unique_identifier: uniqueIdentifier
    },
    process.env.VIASOCKET_EMBED_SECRET
  )
}

async function call(path, uniqueIdentifier, body, method = "POST") {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", authorization: embedToken(uniqueIdentifier) },
    body: body === undefined ? "" : JSON.stringify(body)
  })
  const payload = await response.json()
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `viaSocket ${path} failed with ${response.status}`)
  }
  return payload.data
}

/** Needed only to run actions. Once per (user, app) — store the script_id. */
export async function enableApp(uniqueIdentifier, authId, serviceId = process.env.VIASOCKET_SERVICE_ID) {
  const data = await call(`/embed/enable/${serviceId}/${authId}`, uniqueIdentifier)
  return data.script_id
}

/** Every flow this user has: one per enabled app, one per trigger subscription. */
export async function listUserFlows(uniqueIdentifier) {
  const response = await fetch(`${API}/projects/${process.env.VIASOCKET_PROJECT_ID}/integrations`, {
    headers: { authorization: embedToken(uniqueIdentifier) }
  })
  const payload = await response.json()
  return payload.data?.flows || []
}

/** The script_id of an app this user already enabled, or null. Saves enabling twice. */
export async function findEnabledApp(uniqueIdentifier, serviceId = process.env.VIASOCKET_SERVICE_ID) {
  const flows = await listUserFlows(uniqueIdentifier)
  return flows.find((flow) => flow.service_id === serviceId && flow.status === "active")?.id || null
}

/** status 0 deletes a flow (an enabled app, or a subscription), 2 pauses it, 1 resumes or restores it. */
export async function setFlowStatus(uniqueIdentifier, scriptId, status = 0) {
  return call(`/embed/updatestatus/${scriptId}?status=${status}`, uniqueIdentifier, undefined, "PUT")
}

/** Every app this user has connected — enough to render your own "connected accounts" screen. */
export async function listConnections(uniqueIdentifier) {
  return call("/embed/authentications", uniqueIdentifier, undefined, "GET")
}

/** Disconnects an app. Disable the flows built on it first, or they break. */
export async function revokeConnection(uniqueIdentifier, authId) {
  return call(`/embed/authentications/revoke/${authId}`, uniqueIdentifier, undefined, "DELETE")
}

/**
 * Step 3. The values one field accepts, scoped by what is already chosen.
 *
 * fieldKey is the field's full path ("destination.channel_id" for a nested one), and
 * existingFields is shaped like inputData — nested, never flattened to dotted keys.
 */
export async function listOptions(uniqueIdentifier, actionVersionId, fieldKey, existingFields = {}, authId, { searchText } = {}) {
  const data = await call(`/embed/list-options/${actionVersionId}`, uniqueIdentifier, {
    fieldKey,
    auth_id: authId,
    // Searchable fields take what the user typed inside existingFields, next to the dependency values.
    existingFields: searchText ? { ...existingFields, _searchText: searchText } : existingFields
  })
  // A connection that cannot be read (revoked, another user's auth_id) is answered with 200 and
  // success: true, the failure nested in data. Surface it; an empty picker hides the cause.
  if (data && !Array.isArray(data) && data.response && Number(data.response.status) >= 400) {
    throw new Error(data.response.data?.message || "list-options failed")
  }
  // Two shapes, one helper: some fields wrap the list under data.data. No paging: take the list.
  const options = Array.isArray(data) ? data : data.data
  return { options }
}

/** Step 4. No token — the script_id is the credential. */
export async function runAction(scriptId, actionVersionId, inputData) {
  const response = await fetch(`${RUN}/func/${scriptId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_version_id: actionVersionId, inputData })
  })
  const payload = await response.json()
  // The run URL answers in viaSocket's envelope { success, data } — or with the action's own body at the
  // top level, which may itself carry a `success` key (Slack's "Find Public channel" returns
  // { success, channels }). It is the envelope only when `data` is present.
  const isEnvelope = payload && typeof payload === "object" && typeof payload.success === "boolean" && "data" in payload
  if (isEnvelope ? !payload.success : payload?.success === false) throw new Error(payload.message || payload.error?.message || "Action failed")
  return isEnvelope ? payload.data : payload
}

/**
 * Step 5. `delivery` is { code: script } — a handler we run per event (rule 10, Triggers) — or,
 * as the edge case, { webhook: url } — we POST raw events to a public URL of yours. One or the other.
 */
export async function subscribeEvent(uniqueIdentifier, triggerVersionId, authId, inputData, delivery, meta = {}) {
  const data = await call(`/embed/subscribe-event/${triggerVersionId}`, uniqueIdentifier, {
    auth_id: authId,
    inputData,
    ...delivery,
    meta
  })
  // data.script_id is the subscription; data.inputData.hookUrl is the hook we created.
  return data.script_id
}

export async function updateSubscription(uniqueIdentifier, subscriptionScriptId, changes) {
  return call(`/embed/update-subscribed-event/${subscriptionScriptId}`, uniqueIdentifier, changes, "PUT")
}
```

## Step 1 — the connect button (frontend)

The only browser-side piece. The button carries Google Sheets's own icon (the `<img>` below; its URL is also under
“## Google Sheets”) and its name, so the user recognises what they are connecting; leave the icon out only for a reason
the report names. The `serviceId` is `rowqm5xi2` exactly — never Google Sheets's name or slug, never the id with a name joined on.

**The popup is opened only by `openViasocketConnection`, from the connect script.** Never build a
viasocket URL for it by hand, never `window.open` one, never put the auth page in an iframe: the
script registers the token, hands the session over, opens the right page for the environment and
listens for the result on both of the paths it can arrive by. A URL guessed from this document
opens a page that does not exist, and the user sees "Page not found" in the popup. In your code,
the only `viasocket.com` strings are the connect script URL and the API base.

```html
<button id="connect-app" class="your-button">
  <img src="https://stuff.thingsofbrand.com/google.com/images/img4_googlesheet.png" alt="" width="20" height="20" />
  Connect Google Sheets
</button>

<script type="module">
  // Before the click: the token from your backend’s endpoint, which answers { token }. The click then
  // opens the popup at once, so no popup blocker stops it.
  const { token: embedToken } = await fetch("/api/viasocket/token").then((r) => r.json())

  document.getElementById("connect-app").onclick = () =>
    openViasocketConnection(embedToken, "rowqm5xi2", {
      // The action_ids and trigger_ids this product uses (listed under each action and
      // trigger below): the popup asks only for their scopes. Omit to offer every action.
      filteredActions: ["<action_id>"],
      skipActionSelection: true // straight to the app’s consent screen, no list first
    })

  window.addEventListener("message", async (event) => {
    if (event.data?.type === "viasocket_connection_success") {
      // The connection id IS the auth_id every later call takes. Hand it to your
      // backend, which enables the app and stores the script_id it gets back.
      const authId = event.data.data.id
      await fetch("/api/viasocket/connected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: event.data.serviceId, authId })
      })
      showConnected()
    } else if (event.data?.type === "viasocket_connection_error") {
      showError(event.data.error?.message)
    } else if (event.data?.type === "viasocket_connection_closed") {
      // Best-effort: the popup seems closed and nothing was created. Leave the button as it was;
      // if the user did finish on the app’s sign-in page, a success message still follows.
    }
  })
</script>

<script id="viasocket-connect-script" src="https://flow.viasocket.com/connect.js"></script>
```

**What the popup asks for.** With the `action_id`s and `trigger_id`s this product uses (each is
listed under its action or trigger below), Google Sheets's consent screen asks only for their
scopes, and `skipActionSelection` opens it directly. Without the list the popup offers every Google Sheets
action and trigger and the user decides which to grant; a connection granted for more actions than
the product uses is not an error, only a longer consent screen.

**When the connection expires.** `GET https://flow-api.viasocket.com/embed/authentications` shows it with
`isExpired: true`. Open the same popup with its `auth_id` to sign in again — `openViasocketConnection(embedToken, "rowqm5xi2", { authId })`:
the popup updates that connection in place and the same `auth_id` comes back, so the stored `auth_id`,
the app’s `script_id` and its subscriptions keep working. A product shows this as a Reconnect button
beside the expired connection.

Then, on your backend, for that user:

```js
// Only if you are going to run actions — subscribing to events needs just the authId.
let scriptId = await findEnabledApp(uniqueIdentifier, 'rowqm5xi2')
if (!scriptId) scriptId = await enableApp(uniqueIdentifier, authId)
// store scriptId against (uniqueIdentifier, "rowqm5xi2")
```

## Google Sheets

- `service_id`: `rowqm5xi2`
- icon: https://stuff.thingsofbrand.com/google.com/images/img4_googlesheet.png
- auth: Auth2.0
- 23 actions, 1 triggers

## How to render a picker for any field

This is the part that is not obvious. To show the user a dropdown of Google Sheets values —
repositories, channels, boards, spreadsheets — you do **not** need the action you intend to
run. You need *any* action or trigger that exposes that field, and you call list-options on
that one's `action_version_id`. The field key is the same wherever it appears.

This table gives the cheapest source for every fetchable field of this app: the action with
the fewest prerequisites. Use it to build pickers before you have decided which action the
user is ultimately running.

Every key below is the **full path**, which is exactly what `fieldKey` takes. Where one has a
dot in it the field lives inside an object, so its value is nested under that path in both
`existingFields` and `inputData`.

| field key | label | needs first | search | call list-options on | (that action) |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_Id` | Spreadsheet | — | searchable | `row8qhyi9lo6` | Permanently Delete Spreadsheet |
| `spreadSheet_id` | SpreadSheet | — | searchable | `rowxwbos3gky` | List Spreadsheet Tabs |
| `spreadsheet_id` | Spreadsheet | — | searchable | `rowfzw8l9t2m` | Find Subsheet |
| `destinationSpreadsheetId` | Destination Spreadsheet | — | searchable | `row7l1vrosen` | Copy Sheet To Spreadsheet |
| `folder_id` | Destination Folder | — | searchable | `row2vdwh1c69` | Create Spreadsheet From Template |
| `shared_drive_id` | Shared Drive | — | searchable | `rowvgewgzq01` | List Spreadsheets |
| `spreadSheet_Id` | Spreadsheet | — | searchable | `rowdd8u5lg1k` | Add Multiple Rows  |
| `spreadsheetId` | Spreadsheet | — | — | `rowa9kgepnny` | Create Sheet Column |
| `template_id` | Spreadsheet | — | searchable | `row2vdwh1c69` | Create Spreadsheet From Template |
| `sheet_id` | Sheet | `spreadsheet_id` | — | `row0niyp8eqe` | Update Sheet Name |
| `grid_Id` | Sheet | `spreadsheet_Id` | — | `row7l1vrosen` | Copy Sheet To Spreadsheet |
| `selected_sheets` | Sheet | `template_id` | — | `row2vdwh1c69` | Create Spreadsheet From Template |
| `sheet_Id` | Sheet | `spreadsheet_Id` | searchable | `rowc6kvx92xf` | Lookup Spreadsheet Rows |
| `sheetId` | Sheet | `spreadsheetId` | — | `rowa9kgepnny` | Create Sheet Column |
| `column_name` | Enter Row Data (Comma-Separated) | `sheet_id`, `spreadSheet_Id` | — | `rowdd8u5lg1k` | Add Multiple Rows  |
| `tags` | Template Tags | `template_id`, `selected_sheets` | — | `row2vdwh1c69` | Create Spreadsheet From Template |
| `column_selected` | Columns | `spreadsheet_Id`, `grid_Id`, `column_key` | — | `row5dxvkb0mr` | Add New Row to Sheet |
| `rows_to_update` | Enter Row Data (Comma-Separated) | `spreadsheet_Id`, `grid_Id`, `column_key` | — | `row43c23m929` | Update Multiple Rows |
| `search_filter.lookupColumn` | Lookup Column | `search_filter.spreadsheet_Id`, `search_filter.sheet_Id`, `search_filter.column_key` | — | `rowc6kvx92xf` | Lookup Spreadsheet Rows |
| `sorting.returnColumn` | Return Columns | `sorting.spreadsheet_Id`, `sorting.sheet_Id`, `search_filter.column_key` | — | `rowc6kvx92xf` | Lookup Spreadsheet Rows |
| `unique_field` | Unique Column | `spreadSheet_id`, `sheet_id`, `column_key` | — | `rowempdbsh48` | Row Added Or Updated |
| `watch_fields` | Trigger Column(s) | `spreadSheet_id`, `sheet_id`, `column_key` | — | `rowempdbsh48` | Row Added Or Updated |

"searchable": the field has `enableSearchApi`; send what the user typed, debounced, as `existingFields._searchText` — inside existingFields, next to the dependency values. A new text starts a new list.

Worked example — a picker for `spreadsheet_Id`:

```js
// Permanently Delete Spreadsheet is just the cheapest place this field appears.
const { options } = await listOptions(uniqueIdentifier, 'row8qhyi9lo6', 'spreadsheet_Id', {}, authId)

// options is [{ label, value }] — render label, submit value.
renderSelect(options)
```

## Rendering a form for any action

Only when the end user configures an action themselves. A fixed feature needs a control only for
the values its sample writes as `<…>` — a picker from the field index above, or a choice between
fixed values — not a form. Every action and trigger below is described by the same
field schema, so one renderer serves all of them: give it an `action_version_id`, it draws the
form and produces `inputData`.

| column in the tables below | render as | behaviour |
| --- | --- | --- |
| type `string`, `number`, `date`, `html`, `markdown` | text input (number/date typed) | free text from your user |
| type `boolean` | yes / no | send `true` / `false` |
| type `dropdown` | single select | options from the `value comes from` column |
| type `multiselect` | multi select | send an array of values |
| type `object` | a card containing its child fields (the keys with a dot prefix) | nest the children under the parent key in `inputData` |
| type `dictionary` | key / value rows | send an object |
| type `aifield` | free text | a description the platform turns into structured input; send a string |
| `what it is` | the label and the hint | the first part is the label on the control, the rest its hint; `Yes = true` names the choices a user reads; `default` is the initial value. Every row is shown, or fixed in code with a reason — a `required: yes` row is never dropped because its key looks technical |
| `value comes from: one of …` | static options | those literal values; with no `default`, the sample writes the key as `<one of: …>` — a choice made before the call, the user’s when the right value depends on their account |
| `value comes from: list-options` | select that fetches on open | await listOptions(uniqueIdentifier, versionId, fieldKey, existingFields, authId); show `label`, send `value` |
| `list-options (searchable)` | the same, with a search box | debounce typing and send it as `existingFields._searchText`; a new text starts a new list |
| `needs first` / `list-options after X` | disabled until X has a value | put X's current value in `existingFields`, nested exactly as `inputData`; clear this field when X changes |
| `only applies when …` | hidden unless the condition holds | leave hidden fields out of `inputData` entirely |
| `after X has a value` | the form’s order: shown once X is filled | fill X first — it is the field this one depends on, usually a picker; in a complete `inputData` the key is present |
| `required: yes` | validation | block submit while empty and visible |

`fieldKey` for a fetch is always the full dotted path in the table. The result is the same
`inputData` shape as the sample under each action; submit it unchanged.

The complete recipe — the raw schema and where to get it, the eight rules, a framework-free
form engine and a React skin with paging and search — is its own document. Fetch it when you
build the form:

```http
GET https://flow.viasocket.com/documentation/form-renderer.md
```

This app's raw schema: `POST https://flow.sokt.io/func/scriK4LFg2kc` with `{"service_id":"rowqm5xi2"}` → `{ service, actions, triggers }`, each action and trigger with its two ids and its `input_schema`.

## Actions

Run any of these with `runAction(scriptId, action_version_id, inputData)` — the `action_version_id` printed first under the action, never its `action_id`.

**What a call returns is known only by making it.** The samples below were written by each connector’s author, and some actions have none;
neither is a live response. Before any code reads a field of a result — a step mapping from `context.res`, a handler using a second
app’s return, the product storing an id — run the action once on the test connection (section “A test connection, while building”)
and map from what actually came back. A read action is safe to run as it is; a write action goes against a test target.

**A `<…>` in a sample is a value still owed, never one to send.** `<id from list-options>` is fetched; `<one of: …>` is a
choice between the fixed values in the table — the user’s, on screen, when the right value depends on their own account
(their workspace, personal or shared, admin or not); yours, in code, only when one value serves every user. A `default` in
the table is the form’s initial value, not that decision.


### Add Conditional Formatting Rule

- `action_version_id`: `rowrfpwcfq9p` — for the run call and `list-options`
- `action_id`: `rowl5u5kq9dv` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Apply conditional formatting to cells in a Google Sheets spreadsheet based on their values
- fetch first: `spreadsheet_id`, `sheet_id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `sheet_id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadsheet_id |  |
| `cell_range` | string | yes | Cell Range — Enter the cell range to apply formatting to, in A1 notation. Example: A1:D10, B:B (entire column), or A1 (single cell). | your user |  |
| `rule_type` | dropdown | yes | Rule Type — Choose the type of conditional formatting rule. Boolean Rule applies a fixed format when a condition is met. Gradient Rule applies a color scale based on cell values. — Boolean Rule (Condition-Based Formatting) = "boolean", Gradient Rule (Color … | one of "boolean", "gradient" |  |
| `condition_type` | dropdown | yes | Condition Type — Select the condition that triggers the formatting. Number conditions compare numeric values. Text conditions match string content. Date conditions apply to date values. | one of "NUMBER_GREATER", "NUMBER_GREATER_THAN_EQ", "NUMBER_LESS", "NUMBER_LESS_THAN_EQ", "NUMBER_EQ", "NUMBER_NOT_EQ", "NUMBER_BETWEEN", "NUMBER_NOT_BETWEEN", "TEXT_CONTAINS", "TEXT_NOT_CONTAINS", "TEXT_STARTS_WITH", "TEXT_ENDS_WITH", "TEXT_EQ", "TEXT_IS_URL", "TEXT_IS_EMAIL", "DATE_EQ", "DATE_BEFORE", "DATE_AFTER", "DATE_ON_OR_BEFORE", "DATE_ON_OR_AFTER", "DATE_IS_VALID", "BLANK", "NOT_BLANK", "CUSTOM_FORMULA" | only when rule_type = "boolean" |
| `condition_value` | string | yes | Condition Value — Enter the value for the condition. For 'Between' conditions, enter two values separated by a comma (e.g., 10,50). For date conditions, use YYYY-MM-DD format. For custom formula, start with = (e.g., =A1>100). | your user | applies when rule_type === 'boolean' && condition_type !== 'BLANK' && condition_type !== 'NOT_BLANK' && condition_type !== 'TEXT_IS_URL' && condition_type !== 'TEXT_IS_EMAIL' && condition_type !== 'DATE_IS_VALID' && condition_type !== undefined && condition_type !== '' |
| `format` | object | yes | Cell Formatting — Configure how the matching cells should be formatted when the condition is met. | its child keys, the rows below | only when rule_type = "boolean" |
| `format.background_color` | string | no | Background Color (Hex) — Enter a hex color code for the cell background. Leave blank to keep the default background. give reference for this doc link [here](https://en.wikipedia.org/wiki/Web_colors). | your user |  |
| `format.text_color` | string | no | Text Color (Hex) — Enter a hex color code for the text color. Leave blank to keep the default text color.give reference for this doc link [here](https://en.wikipedia.org/wiki/Web_colors). | your user |  |
| `format.bold` | boolean | no | Bold Text — Make the text bold when the condition is met. — Yes = true, No = false — default false | one of true, false |  |
| `format.italic` | boolean | no | Italic Text — Make the text italic when the condition is met. — Yes = true, No = false — default false | one of true, false |  |
| `format.strikethrough` | boolean | no | Strikethrough — Apply strikethrough to the text when the condition is met. — Yes = true, No = false — default false | one of true, false |  |
| `gradient_minpoint` | object | yes | Gradient — Minimum Point — Configure the minimum value point for the gradient color scale. | its child keys, the rows below | only when rule_type = "gradient" |
| `gradient_minpoint.type` | dropdown | yes | Min Point Type — Choose what the minimum point represents. — Minimum Value in Range = "MIN", Specific Number = "NUMBER", Percentile = "PERCENTILE", Percentage = "PERCENT" — default "MIN" | one of "MIN", "NUMBER", "PERCENTILE", "PERCENT" |  |
| `gradient_minpoint.value` | string | no | Min Point Value — Enter the value for the minimum point (required for Number, Percentile, and Percentage types). | your user |  |
| `gradient_minpoint.color` | string | yes | Min Point Color (Hex) — Enter the hex color code for the minimum value cells. | your user |  |
| `gradient_midpoint` | object | no | Gradient — Midpoint — Configure an optional midpoint for the gradient. When set, the color transitions through three points instead of two. | its child keys, the rows below | only when rule_type = "gradient" |
| `gradient_midpoint.enabled` | boolean | no | Enable Midpoint — Enable a midpoint to create a 3-color gradient scale. — Yes = true, No = false — default false | one of true, false |  |
| `gradient_midpoint.type` | dropdown | no | Mid Point Type — Choose what the midpoint represents. — Specific Number = "NUMBER", Percentile = "PERCENTILE", Percentage = "PERCENT" — default "PERCENTILE" | one of "NUMBER", "PERCENTILE", "PERCENT" |  |
| `gradient_midpoint.value` | string | no | Mid Point Value — Enter the value for the midpoint. | your user |  |
| `gradient_midpoint.color` | string | no | Mid Point Color (Hex) — Enter the hex color code for midpoint cells. | your user |  |
| `gradient_maxpoint` | object | yes | Gradient — Maximum Point — Configure the maximum value point for the gradient color scale. | its child keys, the rows below | only when rule_type = "gradient" |
| `gradient_maxpoint.type` | dropdown | yes | Max Point Type — Choose what the maximum point represents. — Maximum Value in Range = "MAX", Specific Number = "NUMBER", Percentile = "PERCENTILE", Percentage = "PERCENT" — default "MAX" | one of "MAX", "NUMBER", "PERCENTILE", "PERCENT" |  |
| `gradient_maxpoint.value` | string | no | Max Point Value — Enter the value for the maximum point (required for Number, Percentile, and Percentage types). | your user |  |
| `gradient_maxpoint.color` | string | yes | Max Point Color (Hex) — Enter the hex color code for the maximum value cells. | your user |  |
| `rule_priority` | number | no | Rule Priority (Index) — Set the priority of this rule. 0 means highest priority (applied first). Leave blank to default to highest priority. | your user |  |

```js
const result = await runAction(scriptId, 'rowrfpwcfq9p', {
  "spreadsheet_id": "<id from list-options>",
  "sheet_id": "<id from list-options>",
  "cell_range": "<cell_range>",
  "rule_type": "boolean",
  "condition_type": "<one of: NUMBER_GREATER | NUMBER_GREATER_THAN_EQ | NUMBER_LESS | NUMBER_LESS_THAN_EQ | …>",
  "condition_value": "<condition_value>",
  "format": {
    "background_color": "<background_color>",
    "text_color": "<text_color>",
    "bold": false,
    "italic": false,
    "strikethrough": false
  },
  "rule_priority": 0
})
```

No sample of what this call returns is on record. Run it once on the test connection and map from the actual response; do not guess a shape.

### Add Multiple Rows 

- `action_version_id`: `rowdd8u5lg1k` — for the run call and `list-options`
- `action_id`: `rowfudy5tu2q` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Add one or more rows to a specific sheet in a Google Spreadsheet. Provide data column-by-column or paste a JSON array for bulk inserts. If the sheet has no headers, they will be auto-created from your JSON keys.
- fetch first: `spreadSheet_Id`, `sheet_id`, `column_name`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadSheet_Id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `sheet_id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadSheet_Id |  |
| `use_json_rows` | boolean | no | Provide rows as JSON — Choose how you will provide the row data.  • No (default): Provide column-wise comma-separated values using the fields generated below. • Yes: Paste a JSON array of row objects into the 'Rows (JSON Array)' field.  Example JSON: [   { … | one of true, false |  |
| `rows_json` | string | yes | Rows (JSON Array) — If you selected 'Provide rows as JSON?' = Yes, Enter the JSON array of objects here. Each object should use keys that match the sheet headers (case-insensitive and non-alphanumeric treated as underscores). Example:[  { "Name": "Alice", "… | your user | only when use_json_rows = true |
| `column_name` | object | yes | Enter Row Data (Comma-Separated) — Enter row data for comma seperated ,for add multiple rows in sub sheet. | list-options after sheet_id, spreadSheet_Id, one key per option: each option's value, verbatim | only when use_json_rows = false |

```js
const result = await runAction(scriptId, 'rowdd8u5lg1k', {
  "spreadSheet_Id": "<id from list-options>",
  "sheet_id": "<id from list-options>",
  "use_json_rows": false,
  "column_name": {
    "<option value, verbatim, e.g. name@longtext>": "<your value>"
  }
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "data": {
    "updates": {
      "updatedRows": 2,
      "updatedCells": 6,
      "updatedRange": "'Sheet'!A2:C3",
      "spreadsheetId": "sheet_123",
      "updatedColumns": 3
    },
    "spreadsheetId": "sheet_123"
  },
  "message": "Rows added",
  "success": true,
  "appendedRows": 2
}
```

### Add New Row to Sheet

- `action_version_id`: `row5dxvkb0mr` — for the run call and `list-options`
- `action_id`: `rowxsuumuqrt` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Conditionally require column selection only for header-based mapping and support direct column-letter value mapping when no header row is used.
- fetch first: `spreadsheet_Id`, `grid_Id`, `column_selected`, `column_name`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_Id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `grid_Id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadsheet_Id |  |
| `column_key` | boolean | yes | Does your first row contain column name? — Determines how the data columns are labelled. — Enter "true" if the first row contains the column name, else "false". — Yes = true, No = false — default true | one of true, false | after spreadsheet_Id and grid_Id have values |
| `column_selected` | multiselect | yes | Columns — Select the columns for entering the values. | list-options after spreadsheet_Id, grid_Id, column_key |  |
| `column_name` | object | yes | Column Values — Enter the Column Values. | list-options after spreadsheet_Id, grid_Id, column_key, column_selected, one key per option: each option's value, verbatim |  |

```js
const result = await runAction(scriptId, 'row5dxvkb0mr', {
  "spreadsheet_Id": "<id from list-options>",
  "grid_Id": "<id from list-options>",
  "column_key": true,
  "column_selected": [
    "<id from list-options>"
  ],
  "column_name": {
    "<option value, verbatim, e.g. name@longtext>": "<your value>"
  }
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "data": {
    "email": "user@example.com",
    "_sheet_id": "SHEET_ID",
    "_rowNumber": 1,
    "_sheet_title": "Sheet1",
    "_spreadsheet_id": "SPREADSHEET_ID"
  },
  "success": true
}
```

### Batch Update Cell Values

- `action_version_id`: `row2eh6do90m` — for the run call and `list-options`
- `action_id`: `rowfz61wiorf` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Update multiple cells at once
- fetch first: `spreadSheet_id`, `sheet_id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadSheet_id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `sheet_id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadSheet_id |  |
| `value_input_option` | dropdown | yes | Value Input Option — Controls how your values are interpreted when written to the sheet.  • User Entered — values are parsed as if a user typed them. Formulas like =SUM(A1:A5) get calculated, dates get formatted automatically. • Raw — values are stored exac… | one of "USER_ENTERED", "RAW" |  |
| `updates` | object | yes | Range Updates — Define one or more cell or range updates. All updates are written to the sheet in a single API call.  For Values: • Single cell — type the value directly: Done • Single row — [["Alice", 25, "Manager"]] • Multiple rows — [["Alice", 25], ["Bob… | its child keys, the rows below |  |
| `updates.range` | string | yes | Range — Cell or range in A1 notation. For a single cell use A1, for a range use B2:D5, for a different sheet use Sheet2!A1:C3.  To update non-contiguous cells like K2, K4, K7 — enter them comma-separated: K2,K4,K7. Each cell will be matched to the correspon… | your user |  |
| `updates.values` | string | yes | Values — Values to write into the specified range. Accepts a plain value or a JSON 2D array.  • Plain value: Done • Single row: [["Alice", 25, "Manager"]] • Multiple rows: [["Alice", 25], ["Bob", 30]] • Formula: =TODAY() | your user |  |
| `updates.major_dimension` | dropdown | no | Write Direction — Controls whether values fill the range row-by-row or column-by-column. Defaults to By Rows.• By Rows — first inner array fills first row, second fills second row• By Columns — first inner array fills first column, second fills second colum… | one of "ROWS", "COLUMNS" |  |
| `include_values_in_response` | boolean | no | Include Updated Values in Response — When enabled, the action response includes the actual values that were written to the sheet. Useful for confirming updates or mapping written data to the next step in your workflow. — Yes = true, No = false | one of true, false |  |
| `response_value_render_option` | dropdown | no | Response Value Format — Optional. Controls how values appear in the response when Include Updated Values is enabled.  • Formatted Value — numbers and dates shown exactly as displayed in the sheet (default) • Unformatted Value — raw computed values without a… | one of "FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA" | only when include_values_in_response = true |

```js
const result = await runAction(scriptId, 'row2eh6do90m', {
  "spreadSheet_id": "<id from list-options>",
  "sheet_id": "<id from list-options>",
  "value_input_option": "USER_ENTERED",
  "updates": {
    "range": "<range>",
    "values": "<values>",
    "major_dimension": "ROWS"
  },
  "include_values_in_response": "<one of: true | false>",
  "response_value_render_option": "FORMATTED_VALUE"
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "responses": [
    {
      "updatedCells": 1,
      "updatedRange": "S!A1"
    }
  ],
  "spreadsheetId": "sample_spreadsheet",
  "totalUpdatedCells": 1
}
```

### Clear Spreadsheet Row

- `action_version_id`: `row5gakw7s2x` — for the run call and `list-options`
- `action_id`: `rowrkz5awm6c` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Clears the contents of the selected row(s) while keeping the row(s) intact in the spreadsheet.
- fetch first: `spreadsheet_Id`, `grid_Id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_Id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet. — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `grid_Id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadsheet_Id |  |
| `rows_input` | string | yes | Row(s) to Clear — Specify which row(s) to clear. You can enter: a single row such as 5 to clear row 5, multiple rows separated by commas such as 1, 3, 5 to clear rows 1, 3, and 5, or a range of rows such as 1-5 to clear rows 1 through 5. You can also combin… | your user |  |

```js
const result = await runAction(scriptId, 'row5gakw7s2x', {
  "spreadsheet_Id": "<id from list-options>",
  "grid_Id": "<id from list-options>",
  "rows_input": "<rows_input>"
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "sheetId": 123,
  "sheetName": "Sheet1",
  "clearedRows": [
    2
  ],
  "clearedRanges": [
    "Sheet1!A2:Z2"
  ],
  "spreadsheetId": "SAMPLE_SHEET_ID",
  "totalRowsCleared": 1
}
```

### Copy Sheet To Spreadsheet

- `action_version_id`: `row7l1vrosen` — for the run call and `list-options`
- `action_id`: `row0mvohwv2v` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Copy a sheet to another file
- fetch first: `spreadsheet_Id`, `grid_Id`, `destinationSpreadsheetId`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_Id` | dropdown | yes | Source Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `grid_Id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadsheet_Id |  |
| `destinationSpreadsheetId` | dropdown | yes | Destination Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |

```js
const result = await runAction(scriptId, 'row7l1vrosen', {
  "spreadsheet_Id": "<id from list-options>",
  "grid_Id": "<id from list-options>",
  "destinationSpreadsheetId": "<id from list-options>"
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
[
  {
    "index": 0,
    "title": "Sheet1",
    "spreadsheetId": "abc123"
  }
]
```

### Create a Spreadsheet

- `action_version_id`: `rowwy37z95y1` — for the run call and `list-options`
- `action_id`: `rowpt94c8qh3` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- create a new spreadsheet.

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_title` | string | yes | Spreadsheet Title — Enter the title for the new spreadsheet. | your user |  |

```js
const result = await runAction(scriptId, 'rowwy37z95y1', {
  "spreadsheet_title": "<spreadsheet_title>"
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "message": "Spreadsheet created successfully.",
  "success": true,
  "spreadsheetId": "123",
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/123/edit"
}
```

### Create Sheet Column

- `action_version_id`: `rowa9kgepnny` — for the run call and `list-options`
- `action_id`: `row2x1hva7jo` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Insert a new column into the specified Google Sheets sheet at the given index (or append to the end) and optionally set its header.
- fetch first: `spreadsheetId`, `sheetId`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheetId` | dropdown | yes | Spreadsheet — Select or Enter the ID of the spreadsheet . | list-options |  |
| `sheetId` | dropdown | yes | Sheet — Choose or Enter the sheet Id. | list-options after spreadsheetId |  |
| `insertIndex` | number | yes | Insert Column Index — Enter the column number where you want to insert the column. Use 0 for column A, 1 for column B, etc. | your user |  |
| `columnHeader` | string | yes | Column Header — Enter the Column header name. | your user |  |

```js
const result = await runAction(scriptId, 'rowa9kgepnny', {
  "spreadsheetId": "<id from list-options>",
  "sheetId": "<id from list-options>",
  "insertIndex": 0,
  "columnHeader": "<columnHeader>"
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "details": {
    "sheetName": "Sheet1",
    "columnLetter": "B",
    "wasAddedAtEnd": false,
    "insertedAtIndex": 1,
    "headerUpdateResponse": {
      "updatedRows": 1,
      "updatedCells": 1,
      "updatedRange": "Sheet1!B1",
      "spreadsheetId": "spreadsheetIdExample",
      "updatedColumns": 1
    },
    "sheetColumnCountAfterInsertion": 30
  },
  "message": "Column inserted successfully.",
  "success": true
}
```

### Create Spreadsheet From Template

- `action_version_id`: `row2vdwh1c69` — for the run call and `list-options`
- `action_id`: `rowqp64411sk` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Create sheet from template
- fetch first: `template_id`, `selected_sheets`, `folder_id`, `tags`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `template_id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet .Please ensure at least one tag like {{name}} is present in the sheet. — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use … | list-options (searchable) |  |
| `selected_sheets` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after template_id |  |
| `title` | string | yes | Spreadsheet Name — Enter the name for the new spreadsheet file. | your user |  |
| `folder_id` | dropdown | no | Destination Folder — Select the Google Drive folder where the new spreadsheet should be saved. Leave empty to save in root. — Use the 'List Folders' action to get all folders along with their IDs and then map the retrieved data accordingly. | list-options (searchable) |  |
| `tags` | object | no | Template Tags — Fill in the values for each template tag found in your spreadsheet. | list-options after template_id, selected_sheets, one key per option: each option's value, verbatim |  |
| `permission` | dropdown | no | Share File — Share with a Specific User = "share_with_user", Share with Anyone (via link) = "share_with_anyone" | one of "share_with_user", "share_with_anyone" |  |
| `role` | dropdown | yes | Role — Select the access level for the person you are sharing with. — Can View = "reader", Can Comment = "commenter", Can Edit = "writer" | one of "reader", "commenter", "writer" | after permission has a value |
| `emailAddress` | string | yes | Email Address — Enter the email address of the person you want to share this spreadsheet with. | your user | only when permission = "share_with_user" |
| `download_formats` | multiselect | no | Include Download Links Format in Response — Select the file formats you want included in the response. Only the selected format links will be returned. | one of "application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "text/tab-separated-values", "application/vnd.oasis.opendocument.spreadsheet", "application/x-vnd.oasis.opendocument.spreadsheet", "application/zip" |  |

```js
const result = await runAction(scriptId, 'row2vdwh1c69', {
  "template_id": "<id from list-options>",
  "selected_sheets": "<id from list-options>",
  "title": "<title>",
  "folder_id": "<id from list-options>",
  "tags": {
    "<option value, verbatim, e.g. name@longtext>": "<your value>"
  },
  "permission": "<one of: share_with_user | share_with_anyone>",
  "role": "<one of: reader | commenter | writer>",
  "emailAddress": "<emailAddress>",
  "download_formats": [
    "<one of: application/pdf | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | text/csv | text/tab-separated-values | …>"
  ]
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "webViewLink": "https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit",
  "downloadLinks": {
    "text/csv": "https://docs.google.com/spreadsheets/export?id=SPREADSHEET_ID&exportFormat=csv",
    "application/pdf": "https://docs.google.com/spreadsheets/export?id=SPREADSHEET_ID&exportFormat=pdf"
  },
  "newSpreadsheetId": "SPREADSHEET_ID"
}
```

### Create Subsheet

- `action_version_id`: `rowktxv36kxe` — for the run call and `list-options`
- `action_id`: `rowpqyy2f4mq` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Add a new subsheet to a spreadsheet and optionally set its position and add column headers in the first row.
- fetch first: `spreadsheet_Id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_Id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet. — Enter the Spreadsheet ID manually, or get it from actions like List Spreadsheets or Find Spreadsheet. | list-options (searchable) |  |
| `sheet_title` | string | yes | Subsheet Name | your user |  |
| `sheet_position` | string | no | Subsheet Position — Enter 0 to place it as the very first sheet, 1 to place it second, 2 to place it third, and so on. Leave blank to place it last. | your user |  |
| `column_names` | string | no | Column Headers — Enter column names for the subsheet as comma-separated values. | your user |  |

```js
const result = await runAction(scriptId, 'rowktxv36kxe', {
  "spreadsheet_Id": "<id from list-options>",
  "sheet_title": "<sheet_title>",
  "sheet_position": "<sheet_position>",
  "column_names": "<column_names>"
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "message": "Subsheet created",
  "sheetId": 12345,
  "sheetTitle": "NewSheet",
  "columnsAdded": [
    "col1",
    "col2"
  ],
  "spreadsheetId": "sp_123",
  "gridProperties": {
    "rowCount": 1000,
    "columnCount": 26
  }
}
```

### Delete Rows

- `action_version_id`: `rowu9y915b4h` — for the run call and `list-options`
- `action_id`: `rowe4xn7u0ek` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Delete one or more rows from a specific sheet in a Google Spreadsheet using a row range or row numbers.
- fetch first: `spreadsheet_Id`, `grid_Id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_Id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet. — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `grid_Id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadsheet_Id |  |
| `deletion_mode` | dropdown | yes | Deletion Mode — Choose how to specify which rows to delete. Use 'Row Range' to delete a consecutive block of rows, or 'Specific Rows' to delete individual rows by number. — Row Range (range) = "range", Specific Rows (comma-seperated) = "specific" — default … | one of "range", "specific" |  |
| `start_row` | number | yes | Start Row Number — Enter the first row number to delete. Row numbers are 1-based (row 1 is the first row of the sheet). If your sheet has a header, row 2 is typically the first data row. | your user | only when deletion_mode = "range" |
| `end_row` | number | yes | End Row Number — Enter the last row number to delete (inclusive). Example: entering 10 will delete up to and including row 10. | your user | only when deletion_mode = "range" |
| `row_numbers` | string | yes | Row Numbers to Delete — Enter the row numbers to delete, separated by commas. | your user | only when deletion_mode = "specific" |

```js
const result = await runAction(scriptId, 'rowu9y915b4h', {
  "spreadsheet_Id": "<id from list-options>",
  "grid_Id": "<id from list-options>",
  "deletion_mode": "specific",
  "row_numbers": "<row_numbers>"
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "success": true,
  "spreadsheetId": "sp_1"
}
```

### Find Subsheet

- `action_version_id`: `rowfzw8l9t2m` — for the run call and `list-options`
- `action_id`: `rowf7qm6gp9t` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Searches a sheet in a spreadsheet by name and returns the sheet name, column titles, and number of rows.
- fetch first: `spreadsheet_id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `matchType` | dropdown | yes | Match Type — Choose how the sheet name should be matched. — Exact Match = "exact", Fuzzy Match = "fuzzy" | one of "exact", "fuzzy" |  |
| `sheet_name` | string | yes | Subsheet Name — Enter the name of the subsheet you want to fetch data from. | your user |  |

```js
const result = await runAction(scriptId, 'rowfzw8l9t2m', {
  "spreadsheet_id": "<id from list-options>",
  "matchType": "<one of: exact | fuzzy>",
  "sheet_name": "<sheet_name>"
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "headers": [
    "Col1",
    "Col2"
  ],
  "message": "Successfully fetched data",
  "sheet_id": 0,
  "total_rows": 3,
  "matched_sheet": "Sheet1"
}
```

### Format Spreadsheet Row

- `action_version_id`: `rowjqvhl7dqw` — for the run call and `list-options`
- `action_id`: `row97jxoaqyf` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Format row font and background
- fetch first: `spreadsheet_id`, `sheet_id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `sheet_id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadsheet_id |  |
| `row_number` | number | yes | Row Number — Enter the row number to format. Row 1 is the very first row (typically your header). Accepts dynamic values mapped from trigger data. | your user |  |
| `column_range_type` | dropdown | yes | Apply Formatting To — Choose whether to apply the formatting across the entire row or limit it to a specific range of columns. — Entire Row (all columns) = "entire", Specific Column Range = "range" — default "entire" | one of "entire", "range" |  |
| `column_range` | object | yes | Column Range — Specify the start and end columns using standard spreadsheet . | its child keys, the rows below | only when column_range_type = "range" |
| `column_range.start_column` | string | yes | Start Column — Enter the first column letter to include. | your user |  |
| `column_range.end_column` | string | yes | End Column — Enter the last column letter to include. Formatting will cover all columns from Start to End. | your user |  |
| `format_categories` | multiselect | yes | Formatting Properties to Apply — Select which formatting properties you want to configure. Only the selected categories will be applied — existing formatting outside your selection will remain untouched. | one of "text_style", "font", "background", "alignment", "wrap", "number_format", "borders" |  |
| `text_style` | object | no | Text Style — Configure text decoration options. | its child keys, the rows below | applies when format_categories && format_categories.includes('text_style') |
| `text_style.bold` | boolean | no | Bold — Make the text bold. — Yes = true, No = false — default false | one of true, false |  |
| `text_style.italic` | boolean | no | Italic — Make the text italic. — Yes = true, No = false — default false | one of true, false |  |
| `text_style.underline` | boolean | no | Underline — Underline the text. — Yes = true, No = false — default false | one of true, false |  |
| `text_style.strikethrough` | boolean | no | Strikethrough — Apply strikethrough formatting to the text. — Yes = true, No = false — default false | one of true, false |  |
| `font_settings` | object | no | Font Settings — Configure the font family, size, and color. Leave any field blank to keep the existing value. | its child keys, the rows below | applies when format_categories && format_categories.includes('font') |
| `font_settings.font_family` | string | no | Font Family — Enter the font family name exactly as it appears in Google Sheets. Learn more about [typefaces](https://en.wikipedia.org/wiki/Typeface). | your user |  |
| `font_settings.font_size` | number | no | Font Size (pt) — Enter the font size in points (pt). Common values: 10, 11, 12, 14, 16, 18, 24. | your user |  |
| `font_settings.font_color` | string | no | Font Color (Hex Code) — Enter a hex color code for the text color. Must include the # symbol. give reference for this doc link [here](https://en.wikipedia.org/wiki/Web_colors). | your user |  |
| `background_color` | string | no | Background Color (Hex Code) — Enter a hex color code for the cell background color. Must include the # symbol. Common values: #FFFF00 (yellow), #90EE90 (light green), #ADD8E6 (light blue), #FFFFFF (white). give reference for this doc link [here](https://en.… | your user | applies when format_categories && format_categories.includes('background') |
| `alignment` | object | no | Text Alignment — Set how text is positioned horizontally and vertically within the cells. | its child keys, the rows below | applies when format_categories && format_categories.includes('alignment') |
| `alignment.horizontal` | dropdown | no | Horizontal Alignment — Set the left-right alignment of text within each cell. — Left = "LEFT", Center = "CENTER", Right = "RIGHT", Justify = "JUSTIFY" — default "LEFT" | one of "LEFT", "CENTER", "RIGHT", "JUSTIFY" |  |
| `alignment.vertical` | dropdown | no | Vertical Alignment — Set the top-bottom alignment of text within each cell. — Top = "TOP", Middle = "MIDDLE", Bottom = "BOTTOM" — default "MIDDLE" | one of "TOP", "MIDDLE", "BOTTOM" |  |
| `wrap_strategy` | dropdown | no | Text Wrap — Choose how text behaves when it is longer than the cell width. — Wrap — text wraps to the next line within the cell = "WRAP", Clip — text is cut off at the cell edge = "CLIP", Overflow — text spills into adjacent empty cells = "OVERFLOW_CELL" — … | one of "WRAP", "CLIP", "OVERFLOW_CELL" | applies when format_categories && format_categories.includes('wrap') |
| `number_format` | object | no | Number Format — Set how numeric values in this row are displayed. This does not change the underlying data — only its visual presentation. | its child keys, the rows below | applies when format_categories && format_categories.includes('number_format') |
| `number_format.type` | dropdown | no | Format Type — Select the format category that best matches the data in this row. — default "AUTOMATIC" | one of "AUTOMATIC", "NUMBER", "CURRENCY", "PERCENT", "DATE", "DATE_TIME", "TIME", "TEXT", "CUSTOM" |  |
| `number_format.pattern` | string | no | Custom Pattern — Enter a custom format pattern. Used only when Format Type is set to Custom Pattern. | your user |  |
| `borders` | object | no | Borders — Add or remove borders on the cells of this row. The same border style and color will be applied to all selected sides. Learn more about [border styles](https://en.wikipedia.org/wiki/Table_(information)#Borders). | its child keys, the rows below | applies when format_categories && format_categories.includes('borders') |
| `borders.apply_to` | multiselect | no | Apply Border To — Select which sides of the cells should receive the border. — Top Edge = "top", Bottom Edge = "bottom", Left Outer Edge = "left", Right Outer Edge = "right", Inner Horizontal (between cells) = "innerHorizontal" | one of "top", "bottom", "left", "right", "innerHorizontal" |  |
| `borders.style` | dropdown | no | Border Style — Select the visual style of the border line. — default "SOLID" | one of "SOLID", "SOLID_MEDIUM", "SOLID_THICK", "DASHED", "DOTTED", "DOUBLE", "NONE" |  |
| `borders.color` | string | no | Border Color (Hex Code) — Enter a hex color code for the border color. Must include the # symbol. give reference for this doc link [here](https://en.wikipedia.org/wiki/Web_colors). — default "#000000" | your user |  |

```js
const result = await runAction(scriptId, 'rowjqvhl7dqw', {
  "spreadsheet_id": "<id from list-options>",
  "sheet_id": "<id from list-options>",
  "row_number": 0,
  "column_range_type": "entire",
  "format_categories": [
    "<one of: text_style | font | background | alignment | …>"
  ],
  "text_style": {
    "bold": false,
    "italic": false,
    "underline": false,
    "strikethrough": false
  },
  "font_settings": {
    "font_family": "<font_family>",
    "font_size": 0,
    "font_color": "<font_color>"
  },
  "background_color": "<background_color>",
  "alignment": {
    "horizontal": "LEFT",
    "vertical": "MIDDLE"
  },
  "wrap_strategy": "OVERFLOW_CELL",
  "number_format": {
    "type": "AUTOMATIC",
    "pattern": "<pattern>"
  },
  "borders": {
    "apply_to": [
      "<one of: top | bottom | left | right | …>"
    ],
    "style": "SOLID",
    "color": "#000000"
  }
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "status": "success",
  "sheetId": "1",
  "rowNumber": 1,
  "spreadsheetId": "SPREADSHEET_X",
  "formattingApplied": [
    "text_style",
    "font"
  ]
}
```

### Get Row Details

- `action_version_id`: `rowwew5qgitc` — for the run call and `list-options`
- `action_id`: `rowioybw3c8a` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Retrieve values and metadata for a specific row in a spreadsheet sheet.
- fetch first: `spreadSheet_id`, `sheet_id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadSheet_id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `sheet_id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadSheet_id |  |
| `column_key` | boolean | yes | Does your first row contain column name? — Determines how the data columns are labeled. — Yes = true, No = false — default true | one of true, false |  |
| `row_number` | number | yes | Row Number — Enter the sub sheet row number to fetch. | your user | after sheet_id has a value |

```js
const result = await runAction(scriptId, 'rowwew5qgitc', {
  "spreadSheet_id": "<id from list-options>",
  "sheet_id": "<id from list-options>",
  "column_key": true,
  "row_number": 0
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "message": "Row not found",
  "_sheetName": "Sheet1",
  "spreadsheetId": "sheet_123"
}
```

### Get Rows From Range

- `action_version_id`: `rowzb4wbvcpz` — for the run call and `list-options`
- `action_id`: `rowew4bwgsqk` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Retrieve rows from sheet range
- fetch first: `spreadsheet_Id`, `grid_Id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_Id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `grid_Id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadsheet_Id |  |
| `range` | string | yes | Range — Enter the range of the sheet here. E.g. A2:D5. | your user |  |

```js
const result = await runAction(scriptId, 'rowzb4wbvcpz', {
  "spreadsheet_Id": "<id from list-options>",
  "grid_Id": "<id from list-options>",
  "range": "<range>"
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "data": [
    {
      "Name": "John",
      "Email": "john@example.com",
      "Timestamp": "2026-04-24 09:00",
      "Row Number": 2
    }
  ],
  "success": true
}
```

### List Rows in Sheet

- `action_version_id`: `rowyu1mevdtq` — for the run call and `list-options`
- `action_id`: `rowlpijbo5k1` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Get rows from a sheet tab as objects with row numbers. Supports an optional header row, offset/limit paging, and fetching from the last row.
- fetch first: `spreadSheet_id`, `sheet_id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadSheet_id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `sheet_id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadSheet_id |  |
| `column_key` | boolean | yes | Does your first row contain column name? — Determines how the data columns are labeled. — Yes = true, No = false | one of true, false |  |
| `sorting_limit` | object | no | sorting and limit | its child keys, the rows below |  |
| `sorting_limit.row_count` | number | no | Row Count — Enter the number of rows you want to retrieve. If not specified will return the all the available matching rows. | your user |  |
| `sorting_limit.is_last_row` | boolean | no | List from last row — List from the last row of the spreadsheet. Select “Yes” to enable. — Yes = true, No = false — default false | one of true, false |  |
| `sorting_limit.offset_row` | number | no | Offset Row — Enter the offset value to start the list from.This is the row number to start. | your user | applies when !sorting_limit.is_last_row |

```js
const result = await runAction(scriptId, 'rowyu1mevdtq', {
  "spreadSheet_id": "<id from list-options>",
  "sheet_id": "<id from list-options>",
  "column_key": "<one of: true | false>",
  "sorting_limit": {
    "row_count": 0,
    "is_last_row": false,
    "offset_row": 0
  }
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "data": [
    {
      "A": "x",
      "B": "y",
      "_rowNumber": 2
    }
  ],
  "offset": 2,
  "success": true,
  "subsheet_Id": "12",
  "subsheet_name": "Sheet1",
  "spreadsheet_Id": "sht_1"
}
```

### List Spreadsheet Tabs

- `action_version_id`: `rowxwbos3gky` — for the run call and `list-options`
- `action_id`: `rowtc0ud5uci` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Lists all tabs (sheets) in a spreadsheet and returns the total count.
- fetch first: `spreadSheet_id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadSheet_id` | dropdown | yes | SpreadSheet — Select or Enter the Spreadsheet Id. — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |

```js
const result = await runAction(scriptId, 'rowxwbos3gky', {
  "spreadSheet_id": "<id from list-options>"
})
```

No sample of what this call returns is on record. Run it once on the test connection and map from the actual response; do not guess a shape.

### List Spreadsheets

- `action_version_id`: `rowvgewgzq01` — for the run call and `list-options`
- `action_id`: `rowju3dxf5ss` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Fetch all spreadsheets
- fetch first: `shared_drive_id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `fetch_mode` | dropdown | yes | How Do You Want to Fetch Spreadsheets? — Choose how you want to find your Google Sheets spreadsheets. — All My Spreadsheets = "all", Search by Name = "search", Recently Modified = "recent", Shared with Me = "shared", Starred Spreadsheets = "starred" — defau… | one of "all", "search", "recent", "shared", "starred" |  |
| `search_keyword` | string | yes | Search Keyword — Enter a keyword to search spreadsheets by name. Partial matches are supported (e.g., entering 'Sales' will return 'Sales Report Q1', 'Sales Dashboard', etc.). | your user | only when fetch_mode = "search" |
| `modified_after` | string | no | Modified After — Enter the date from which you want to filter spreadsheets. Only spreadsheets modified after this date will be returned. Format: YYYY-MM-DD (e.g., 2024-06-01). | your user | only when fetch_mode = "recent" |
| `source` | string | no |  | your user |  |
| `shared_drive_id` | dropdown | yes | Shared Drive — Select the Shared Drive to search in. Only Shared Drives you have access to will appear here. — To find your Shared Drive ID manually: Open Google Drive → Click 'Shared Drives' in the left sidebar → Open the desired Shared Drive → Copy the ID… | list-options (searchable) | only when source = "drive" |
| `owner_filter` | dropdown | no | Ownership Filter — Filter spreadsheets by who owns them. Select 'Owned by Me' to see only spreadsheets you created. Useful when searching across All Drives. — All (Any Owner) = "any", Owned by Me = "me", Not Owned by Me = "not_me" — default "any" | one of "any", "me", "not_me" |  |
| `sort_by` | dropdown | no | Sort By — Choose the field by which results are sorted. 'Last Modified' returns the most recently edited spreadsheets first. — Name (Alphabetical) = "name", Last Modified = "modifiedTime", Date Created = "createdTime", Last Viewed by Me = "viewedByMeTime", … | one of "name", "modifiedTime", "createdTime", "viewedByMeTime", "sharedWithMeTime" |  |
| `sort_order` | dropdown | no | Sort Order — Choose whether results appear newest first (Descending) or oldest first (Ascending). — Descending (Newest First) = "desc", Ascending (Oldest First) = "asc" — default "desc" | one of "desc", "asc" |  |
| `max_results` | number | no | Maximum Results — Maximum number of spreadsheets to return per run. Minimum is 1, maximum is 1000. Default is 50. | your user |  |
| `response_fields` | multiselect | no | Fields to Include in Response — Select the data fields to include in the response. Only selected fields are returned, keeping your automation data clean and fast. Essential fields are preselected. | one of "id", "name", "webViewLink", "webContentLink", "createdTime", "modifiedTime", "modifiedByMeTime", "viewedByMeTime", "sharedWithMeTime", "owners", "lastModifyingUser", "sharingUser", "shared", "starred", "parents", "driveId", "thumbnailLink", "iconLink", "description", "capabilities" |  |
| `page_token` | string | no | Page Token (For Next Page) — Enter the 'nextPageToken' value from the previous run's response to fetch the next set of results. Leave empty to start from the beginning. | your user |  |

```js
const result = await runAction(scriptId, 'rowvgewgzq01', {
  "fetch_mode": "all",
  "source": "<source>",
  "shared_drive_id": "<id from list-options>",
  "owner_filter": "any",
  "sort_by": "modifiedTime",
  "sort_order": "desc",
  "max_results": 0,
  "response_fields": [
    "<one of: id | name | webViewLink | webContentLink | …>"
  ],
  "page_token": "<page_token>"
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "hasfound": true,
  "fetchedCount": 1,
  "hasMorePages": false,
  "spreadsheets": [
    {
      "id": "sheet_1",
      "name": "Sales",
      "owners": [
        {
          "me": true,
          "displayName": "Alice",
          "emailAddress": "alice@example.com",
          "permissionId": "perm_1"
        }
      ],
      "shared": false,
      "createdTime": "2026-07-01T00:00:00Z",
      "webViewLink": "https://docs.google.com/spreadsheets/d/sheet_1",
      "modifiedTime": "2026-07-02T00:00:00Z"
    }
  ],
  "nextPageToken": ""
}
```

### Lookup Spreadsheet Rows

- `action_version_id`: `rowc6kvx92xf` — for the run call and `list-options`
- `action_id`: `rowetjd2kmog` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Find rows in a Google Sheet that match a column value or an advanced filter.
- fetch first: `spreadsheet_Id`, `sheet_Id`, `search_filter.lookupColumn`, `sorting.returnColumn`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_Id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet. — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `sheet_Id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options (searchable) after spreadsheet_Id |  |
| `search_filter` | object | no | Search Filter — Filter configuration to return the sheet rows based on the condition met. | its child keys, the rows below | after sheet_Id has a value |
| `search_filter.column_key` | boolean | yes | Does your first row contain column name? — Determines how the data columns are labelled. — Enter "true" if the first row contains the column name, else "false". — Yes = true, No = false — default true | one of true, false |  |
| `search_filter.type_search_filter` | dropdown | yes | Search Filter Type — Select the filter type. Basic matches a single column value exactly. Advance lets you write a custom condition across multiple columns. — Enter "basic" for a single column exact match or "advance" for a custom multi-column condition. — … | one of "basic", "advance" |  |
| `search_filter.lookupColumn` | dropdown | yes | Lookup Column — Select the column to search in, based on header names. — To determine whether to enter a column name or letter, set 'Does your first row contain column name?'. | list-options after search_filter.spreadsheet_Id, search_filter.sheet_Id, search_filter.column_key | only when search_filter.type_search_filter = "basic" |
| `search_filter.lookupValue` | string | yes | Lookup Value — The match is case-sensitive and exact. | your user | only when search_filter.type_search_filter = "basic" |
| `search_filter.ai_search` | aifield | yes | Advance Filter Condition Prompt — Enter the prompt condition including the column names and values to return the rows which match the condition. | your user | only when search_filter.type_search_filter = "advance" |
| `sorting` | object | no | Sorting and Limit — Configure how many matching rows to return and in which order. | its child keys, the rows below | applies when ["spreadsheet_Id"] && ["sheet_Id"] |
| `sorting.row_count` | number | no | Row Count — Enter the number of rows you want to retrieve. If not specified, will return all the available matching rows. | your user |  |
| `sorting.is_last_row` | boolean | yes | Search from last row — Search from the last row of the spreadsheet up. Select “Yes” to enable. — Enter "true" for search from the last row of the spreadsheet. — Yes = true, No = false — default false | one of true, false |  |
| `sorting.returnColumn` | multiselect | no | Return Columns — Select the column to return in response, If selected will return the selected columns. If left empty will return all the columns. — To determine whether to enter a column name or letter, set 'Does your first row contain column name?'. | list-options after sorting.spreadsheet_Id, sorting.sheet_Id, search_filter.column_key |  |

```js
const result = await runAction(scriptId, 'rowc6kvx92xf', {
  "spreadsheet_Id": "<id from list-options>",
  "sheet_Id": "<id from list-options>",
  "search_filter": {
    "column_key": true,
    "type_search_filter": "basic",
    "lookupColumn": "<id from list-options>",
    "lookupValue": "<lookupValue>"
  },
  "sorting": {
    "row_count": 0,
    "is_last_row": false,
    "returnColumn": [
      "<id from list-options>"
    ]
  }
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "data": [],
  "message": "No rows",
  "success": false,
  "subsheet_Id": "11",
  "subsheet_name": "Sheet1",
  "spreadsheet_Id": "sp_123"
}
```

### Permanently Delete Spreadsheet

- `action_version_id`: `row8qhyi9lo6` — for the run call and `list-options`
- `action_id`: `rowo1pd2o8yt` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Permanently delete a spreadsheet from Google Drive, including files on shared drives.
- fetch first: `spreadsheet_Id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_Id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |

```js
const result = await runAction(scriptId, 'row8qhyi9lo6', {
  "spreadsheet_Id": "<id from list-options>"
})
```

No sample of what this call returns is on record. Run it once on the test connection and map from the actual response; do not guess a shape.

### Update Multiple Rows

- `action_version_id`: `row43c23m929` — for the run call and `list-options`
- `action_id`: `rowvd2mnnjsp` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Update values in one or more rows of a Google Sheet.
- fetch first: `spreadsheet_Id`, `grid_Id`, `rows_to_update`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_Id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `grid_Id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadsheet_Id | after spreadsheet_Id has a value |
| `column_key` | boolean | yes | Does your first row contain column names? — If yes, columns will be shown by header name. If no, columns will be shown by letter (A, B, C...). — If true, columns will be shown by header name. If false, columns will be shown by letter (A, B, C...). — Yes = t… | one of true, false |  |
| `rows_to_update` | object | yes | Enter Row Data (Comma-Separated) — Enter comma-separated values for each field below to update multiple rows at once. The Nth value in Row Numbers matches the Nth value in every column field. Leave a position empty (e.g. "val1,,val3") to keep that row's val… | list-options after spreadsheet_Id, grid_Id, column_key, one key per option: each option's value, verbatim | after grid_Id has a value |

```js
const result = await runAction(scriptId, 'row43c23m929', {
  "spreadsheet_Id": "<id from list-options>",
  "grid_Id": "<id from list-options>",
  "column_key": "<one of: true | false>",
  "rows_to_update": {
    "<option value, verbatim, e.g. name@longtext>": "<your value>"
  }
})
```

No sample of what this call returns is on record. Run it once on the test connection and map from the actual response; do not guess a shape.

### Update Sheet Name

- `action_version_id`: `row0niyp8eqe` — for the run call and `list-options`
- `action_id`: `rowaya0i80ed` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Renames an existing sheet (tab) within a Google Spreadsheet to a new name you specify.
- fetch first: `spreadsheet_id`, `sheet_id`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `sheet_id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadsheet_id |  |
| `new_sheet_name` | string | yes | New Sheet Name — Enter the new name for the selected sheet. Sheet names must be unique within the spreadsheet. | your user | after spreadsheet_id and sheet_id have values |

```js
const result = await runAction(scriptId, 'row0niyp8eqe', {
  "spreadsheet_id": "<id from list-options>",
  "sheet_id": "<id from list-options>",
  "new_sheet_name": "<new_sheet_name>"
})
```

No sample of what this call returns is on record. Run it once on the test connection and map from the actual response; do not guess a shape.

### Update Spreadsheet Row

- `action_version_id`: `rowvmy1uc9yo` — for the run call and `list-options`
- `action_id`: `row1qvdf0nuc` — for the connect popup's `filteredActions` (Step 1), an automation step’s `action_id` and the prebuilt UI’s `open: { actionId }`. Never in place of the version id above, nor the other way round
- Update columns in sheet row
- fetch first: `spreadsheet_Id`, `grid_Id`, `column_selected`, `column_name`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadsheet_Id` | dropdown | yes | Spreadsheet — Select or enter the ID of the spreadsheet . — You will find the Spreadsheet ID on the spreadsheet URL https://docs.google.com/spreadsheets/d/{spreadsheet_Id}/ or you can use the action like search spreadsheet or list spreadsheet. | list-options (searchable) |  |
| `grid_Id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. — You will find the sheet ID on the spreadsheet URL gid=, or you can use the action like search sheet or list sheet. | list-options after spreadsheet_Id |  |
| `record` | number | yes | Row Number — Enter the row number you want to update. | your user | after grid_Id has a value |
| `column_key` | boolean | yes | Does your first row contain column name? — Determines how the data columns are labelled. — Enter "true" if the first row contains the column name, else "false". — Yes = true, No = false — default true | one of true, false | after spreadsheet_Id and grid_Id have values |
| `valueInputOption` | dropdown | no | Value Input Option — Choose how the entered values should be interpreted by Google Sheets. Default is RAW — Raw (store value exactly as entered) = "RAW", User Entered (interpret as if typed by a user, e.g. formulas, dates) = "USER_ENTERED" | one of "RAW", "USER_ENTERED" |  |
| `column_selected` | multiselect | yes | Columns — Select the columns for entering the values. | list-options after spreadsheet_Id, grid_Id, column_key |  |
| `column_name` | object | yes | Column Values — Enter the Column Values. | list-options after spreadsheet_Id, grid_Id, column_key, column_selected, one key per option: each option's value, verbatim |  |

```js
const result = await runAction(scriptId, 'rowvmy1uc9yo', {
  "spreadsheet_Id": "<id from list-options>",
  "grid_Id": "<id from list-options>",
  "record": 0,
  "column_key": true,
  "valueInputOption": "<one of: RAW | USER_ENTERED>",
  "column_selected": [
    "<id from list-options>"
  ],
  "column_name": {
    "<option value, verbatim, e.g. name@longtext>": "<your value>"
  }
})
```

A sample of what this call returns, as the connector’s author wrote it; a live response can differ. Run the action once on the test connection before a later step maps from it:

```json
{
  "data": {
    "_sheet_id": "0",
    "_rowNumber": 1,
    "_sheet_title": "S1",
    "_spreadsheet_id": "sheet_1"
  }
}
```

## Triggers

Subscribing to an event means telling us **what to do when it fires**. That is a `code` handler:
a short script we run on our servers per event, with the event in `context.req.body`. Your server
is not in the path; the handler does the work itself. Decide from what the product wants:

| When the event fires, the product wants… | Handler |
| --- | --- |
| something to happen in another app the user connected (“new mail → post to Slack”) | **Template A**: run that app’s action |
| its own backend to know (“new mail → save it in our database”) | **Template B**: call your own API, with your own auth header baked in |
| both | one handler doing A, then B |
| raw events pushed to a public, unauthenticated endpoint of yours | `webhook: url` instead of `code` — the edge case; confirm with the developer before choosing it |

**See the real event before mapping it.** Whichever handler you write maps keys of the event. Fetch one
real event of the trigger first — for the connection the handler will run on (the developer’s own Google Sheets
connection while building, the user’s at setup):

```bash
curl -X POST 'https://flow.sokt.io/func/scrijZpnr8zJ?action_id=<trigger_id>&auth_id=<auth_id>&authType=Auth2.0' \
  -H 'Content-Type: application/json' \
  -d '{"context":{"inputData":{}}}'
# → one real event of this trigger for this connection: exactly what context.req.body holds when it fires
```

It answers with **one real event of that trigger for that connection**, as the app delivers it —
the object a handler reads as `context.req.body`, and that an automation’s steps read at
`context.req.body` when the trigger fires. Map from its keys, not from the trigger’s name or the
catalog’s generic `sample_output`: the same event has `From.email` in one app and `sender` in
another, and only this call shows which, for this account, with this `inputData`.

- The query key is `action_id`, but it takes the trigger’s **`trigger_id`** (never its
  `trigger_version_id`, which answers `{ "success": true, "message": "No response" }` and nothing
  else). `auth_id` is the connection to read from — the developer’s own test connection while
  building, the end user’s at setup; `NoAuth` for an app without sign-in. `authType` is the
  catalog’s `service.auth_type` for the app.
- The body is `{ "context": { "inputData": … } }` with the trigger’s own fields, shaped as its table
  says; a required field left out answers 400 with the trigger’s message naming the accepted values.
- `viasocket_help`, when present, is a note from viaSocket about the sample (that nothing matched
  yet and this is a stand-in; that one item of a feed is shown). Read it, drop it, never map it.
- `{ "response": { "status": 400, "data": { "message": "Auth data not found" } } }` means the
  `auth_id` cannot be read: wrong, revoked, or another user’s.
- No token: the `auth_id` is the credential, so this is a server-side or terminal call, never one
  from the browser.

Each trigger below prints this call with its own `trigger_id` and `inputData`; a `<one of: …>` in that `inputData` is a choice between the table’s fixed values, made before the call — the user’s, on screen, when the right value depends on their account; yours in code only when one value serves everyone.

**Template A — run an action in another app.** The other app has its own document: fetch it for the
action’s `action_version_id` and fields, and enable that app once for this user at setup (its Step 1)
to get its `script_id`. Values the action needs picked (a channel, a sheet) are fetched with
`list-options` at setup too. Bake all of them into the string. The run URL takes no token: the
`script_id` is the credential, so the handler needs no secret. Map event keys from the sample
under each trigger below.

```js
// A string, not a function: it is sent to viaSocket and executed there.
// ${…} below are YOUR variables, baked in per user at subscribe time.
const handler = `
  const event = context.req.body
  const response = await fetch("https://flow.sokt.io/func/${otherAppScriptId}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action_version_id: "${otherAppActionVersionId}", // from the other app’s document
      inputData: {
        // that action’s fields, mapped from this event (keys as in the sample below)
        channel_id: "${channelIdPickedAtSetup}",
        text: "New mail from " + event.from + ": " + event.subject
      }
    })
  })
  const result = await response.json()
  // Envelope { success, data }, or the action's own body (which may carry its own success key).
  if ("data" in result ? !result.success : result.success === false) throw new Error(result.message || "action failed")
  return "data" in result ? result.data : result
`
```

**Template B — tell your own product.** Call your API from the handler with your own auth header
baked in. Your endpoint stays protected; nothing has to be public.

```js
const handler = `
  const event = context.req.body
  await axios.post("https://your-app.com/api/viasocket-events", { event, user_id: "${uniqueIdentifier}" }, {
    headers: { authorization: "Bearer ${apiKeyForThisUser}" }
  })
  return { delivered: true }
`
```

Then subscribe with it, on the trigger’s `trigger_version_id` — printed first under each trigger
below, never its `trigger_id`. Each trigger shows this call with its own `inputData`:

```js
await subscribeEvent(uniqueIdentifier, '<trigger_version_id>', authId, inputData, { code: handler }, { user_id: uniqueIdentifier })
```

The edge case, only when the developer wants raw events on a public endpoint of theirs: pass
`webhook: 'https://your-app.com/webhooks/viasocket'` instead of `code`. We POST every event there
with `meta` attached, unauthenticated, so use `meta` to identify the user and treat the body as untrusted.

**Record every subscription you create.** The response gives you only the `script_id`, and
`listFlows` later returns id, title and status — not the `inputData` or the handler. So the only
way to know later *what* a user is subscribed to, with which settings and doing what, is your own
record, keyed by your user and the trigger. Save it in the same transaction as the subscribe call:

```json
{
  "unique_identifier": "<your user id>",
  "service_id": "rowqm5xi2",
  "trigger_version_id": "<the trigger subscribed to>",
  "script_id": "<from the subscribe response>",
  "auth_id": "<the connection used>",
  "inputData": { "...": "exactly what was sent" },
  "delivery": { "code": "<the handler string>" },
  "created_at": "<timestamp>"
}
```

Check this record before subscribing again (same user, same trigger, same `inputData` means it
already exists), use its `script_id` to pause, resume, update or remove the subscription, and show
it to the user as “what is connected”. For a `webhook` subscription store `{ "webhook": "<url>" }`
as the delivery instead.

**How often we check.** Some triggers are polled rather than pushed. For those, `inputData` may
carry `scheduledTime`, the minutes between checks, as a string: `"5"` or `"15"`. Leave it out for
the default. It sits beside the event’s own fields:

```json
{ "channel_id": ["<id from list-options>"], "scheduledTime": "5" }
```


### Row Added Or Updated

- `trigger_version_id`: `rowempdbsh48` — for `subscribe-event` and `list-options`
- `trigger_id`: `rowyysj8ut82` — for the connect popup's `filteredActions` (Step 1), an automation’s `trigger_id` and the prebuilt UI’s `open: { triggerId }`. Never in place of the version id above, nor the other way round
- Runs when row added or updated
- fetch first: `spreadSheet_id`, `sheet_id`, `unique_field`, `watch_fields`

| key | type | required | what it is | value comes from | only applies when |
| --- | --- | --- | --- | --- | --- |
| `spreadSheet_id` | dropdown | yes | SpreadSheet — Select or Enter the Spreadsheet Id. | list-options (searchable) |  |
| `sheet_id` | dropdown | yes | Sheet — Select the Sheet or Enter Sheet ID. | list-options after spreadSheet_id |  |
| `record_type` | dropdown | yes | Choose when to trigger — Select when you want to trigger. — Supports 'new' for new record and 'new_update' for new and updated records. — Both New and Updated Record = "new_update", New Record = "new" — default "new_update" | one of "new_update", "new" | after sheet_id has a value |
| `column_key` | boolean | yes | Does your first row contain column name? — Determines how the data columns are labelled. — Enter "true" if the first row contain the column name. — Yes = true, No = false — default true | one of true, false | after spreadSheet_id and sheet_id have values |
| `unique_field` | dropdown | no | Unique Column — Select column which will have the unique value like ID, email etc. This will help to track if new row added in between rows or any update. — If the first row contain the column name then enter column name else the column letter. | list-options after spreadSheet_id, sheet_id, column_key |  |
| `watch_fields` | multiselect | no | Trigger Column(s) — Select fields to watch, when any changes happen to the selected fields the updated row data is triggered. If none selected will watch all the fields by default. | list-options after spreadSheet_id, sheet_id, column_key | applies when unique_field && record_type == 'new_update' |

```js
// Subscribe once per user. Save the record described under Triggers: script_id, inputData, handler.
const subscriptionId = await subscribeEvent(
  uniqueIdentifier,
  'rowempdbsh48',
  authId,
  {
    "spreadSheet_id": "<id from list-options>",
    "sheet_id": "<id from list-options>",
    "record_type": "new_update",
    "column_key": true,
    "unique_field": "<id from list-options>",
    "watch_fields": [
      "<id from list-options>"
    ]
  },
  { code: handler }, // what to do when it fires — a handler from the templates above
  { user_id: uniqueIdentifier }
)
```

Before mapping its keys, fetch one real event for a connection (the developer’s own while building — `auth_id` from
`GET /embed/authentications` with their test user’s token). What comes back is exactly what `context.req.body` holds:

```bash
curl -X POST 'https://flow.sokt.io/func/scrijZpnr8zJ?action_id=rowyysj8ut82&auth_id=<auth_id>&authType=Auth2.0' \
  -H 'Content-Type: application/json' \
  -d '{"context":{"inputData":{"spreadSheet_id":"<id from list-options>","sheet_id":"<id from list-options>","record_type":"new_update","column_key":true,"unique_field":"<id from list-options>","watch_fields":["<id from list-options>"]}}}'
# → one real event of this trigger for this connection: exactly what context.req.body holds when it fires
```

A sample of the event as the connector’s author recorded it. Map from the sample call above, made for the real connection, not from this:

```json
{
  "values": {
    "Email": "e@x.com",
    "Full Name": "A"
  },
  "_sheet_id": "sh_1",
  "_rowNumber": 2,
  "_spreadsheet_id": "sp_abc"
}
```

## Managing what a user already has

All four are scoped to the `unique_identifier` in the token, so they answer for one end user.

| call | what it is for |
| --- | --- |
| `GET https://flow-api.viasocket.com/projects/projKcrymrh3/integrations` | Every flow this user has. Match `service_id` to find an app they already enabled, and to recover a `script_id`. |
| `PUT https://flow-api.viasocket.com/embed/updatestatus/<script_id>?status=0` | Turn off an enabled app or a trigger subscription: `status=0` deletes it, `status=2` pauses it, `status=1` resumes or restores it. |
| `GET https://flow-api.viasocket.com/embed/authentications` | Every app this user has connected. |
| `DELETE https://flow-api.viasocket.com/embed/authentications/revoke/<auth_id>` | Disconnect an app. Disable its flows first. |

The flows list:

```json
{ "success": true, "data": { "flows": [
  {
    "title": "rowqm5xi2",
    "status": "active",
    "webhook": "https://flow.sokt.io/func/scriRx0PKDEG",
    "auth_id": "auth2c38gFVg_rowqm5xi2",
    "service_id": "rowqm5xi2",
    "id": "scriRx0PKDEG"
  }
] } }
```

`id` is the `script_id`. The list carries no `inputData` and no handler, so a subscription is not
identifiable from it alone: match `id` against the subscription records you saved (Triggers section).

The other two responses:

- `updatestatus` returns the **entire flow record** — its generated script, its whole
  `json_script`, its metadata. Ignore all of it and check `data.status`: `"0"` deleted,
  `"1"` active, `"2"` paused.
- `revoke` returns `{ "success": true, "message": "Successfully deleted authentication data",
  "data": [] }`. The empty array is normal; success is the signal.

## Prove it before you report

Reading code cannot show whether an id names a real app, whether a version id sits where the call takes the
`action_id`, or whether a viasocket URL was built by hand. A script can — no browser needed:

```bash
curl -fsSL https://flow.viasocket.com/viasocket-check.mjs -o viasocket-check.mjs
node viasocket-check.mjs src        # the folders holding the integration; no dependencies, Node 18+
```

It finds every viaSocket id and URL in the code and checks each against the live catalog; it reads no `.env`
file and prints no line of code. Fix every FAIL, keep it as a test (`npm test`, CI) so a later edit that swaps
an id fails there and not in front of a user, and paste its output in the report. With
`VIASOCKET_TEST_EMBED_TOKEN` set to a token signed for a test user it also proves the token.

Then make one real call — run the action; for an event, the sample call, then the event made to happen once —
and report what actually came back, not what the code should return. With a browser at hand, click Connect:
the popup shows Google Sheets's own name and its actions or consent screen; "Page not found", a blank page or
another app is a failure to report, not to work around.

Last, read your own diff for what no script sees, and answer each in the report: the Connect button carries
Google Sheets's icon and name; `closed` from the popup is treated as "nothing yet", not a result; every field key
was copied from the action's table, none typed from a label; the secret and every `script_id` are server-side only.

## When it goes wrong

| symptom | cause |
| --- | --- |
| 401 / invalid token | Signed with the wrong secret, or the payload is missing `org_id` / `project_id` / `unique_identifier`. |
| Empty option list | `existingFields` is missing something this field depends on, or the `auth_id` belongs to a different `unique_identifier`. |
| Empty option list on a nested field | `fieldKey` was the leaf instead of the full path, or `existingFields` was flattened to dotted keys instead of nested. Both match nothing, and neither errors. |
| A field is ignored, or the record is created empty | An option’s `value` was altered before being used as a key (`name` sent for `name@longtext`), or a key was typed from a label. Keys are each option’s `value`, verbatim. |
| Empty option list, key looks right | Its casing is from another action of this app (`spreadsheet_id` vs `spreadsheet_Id`), or the request said `blockKey` instead of `fieldKey`. Compare with this action’s table, character for character. |
| `options.map is not a function` | The wrapped shape (`data.data`) was not normalised. |
| Picker empty, response is 200 with `data.response.status` 400 | The connection cannot be read: revoked, or the `auth_id` belongs to another `unique_identifier`. The message is in `data.response.data.message`; reconnect the app. |
| App rejects the action | An id was hardcoded instead of fetched, or two mutually exclusive keys were both sent — see the "only applies when" column. |
| The connect popup says "Unknown app", or the listener gets `viasocket_connection_error` naming the id | The `serviceId` was not the bare `service_id` (`rowqm5xi2`): Google Sheets's name, its slug, the id with a name joined on, or an id from another environment. Pass it exactly as this file prints it; `viasocket-check.mjs` catches this before a user does. |
| The popup shows "Page not found" | The popup was opened to a URL built by hand, not by `openViasocketConnection`. Load the connect script from the URL in Step 1 and let it open the popup; nothing else opens it. |
| A step or the product reads `undefined` from an action’s result | The response shape was taken from the sample, or guessed where there was none. Run the action once on the test connection and map from its actual response. |
| A handler reads `undefined` from the event | Its keys were guessed from the trigger’s name or another app’s sample. Run the sample call under Triggers for this connection and map from what it returns; drop `viasocket_help`. |
| The sample call answers `{ "success": true, "message": "No response" }` | Its `action_id` was the `trigger_version_id`. It takes the `trigger_id`. |
| Handler never runs | The subscription was created against a different `auth_id`, or `inputData` did not match the event (wrong label, wrong sheet). |
| Handler runs, the action inside it fails | The `script_id` baked into the handler belongs to another user, or that app was never enabled for this user; or the `inputData` keys do not match the other app’s document. Read the response `message`. |
| Someone asks for a webhook URL | Nobody needs one for “when X, do Y”: the handler does Y itself. A webhook is only for pushing raw events to a public endpoint the product chose to expose. |
| The same event fires twice | Subscribed twice for one user. Check the saved subscription record before subscribing; remove the duplicate with its `script_id`. |
| Connection appears lost | A different `unique_identifier` was used for the same end user. |
| Two script_ids for one app | `enableApp` ran without checking `findEnabledApp` first. |
