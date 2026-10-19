---
name: viasocket-catalog-api
description: >-
  List viaSocket’s apps and every action and trigger version of an app — with its full input
  schema and a real sample — at runtime, with no token, to build this product’s own integrations
  UI over all 2,300+ apps: a search box, an app grid, each app’s actions, a form for the chosen one.
  Use when the task is "every app in our UI", "an integrations page", "let users pick any app and
  any action", or when a form must be drawn for an action without fetching that app’s document.
---

# The catalog API

> Source: https://flow.viasocket.com/documentation/catalog-api.md. Public, no sign-in. Fetch it again for the latest version.
> Part of viaSocket. Start at the skill, https://flow.viasocket.com/documentation/skill.md — setup, every capability, the rules. Every document: https://flow.viasocket.com/documentation/index.md.

Three public endpoints, no token, same data in every environment — and a fourth that reads one real event
of a trigger for a given connection. The first two find and list apps;
the third lists every published action and trigger of one app, each with the schema its form needs. Together
with one form renderer they are enough to put the whole catalog in this product’s own screens —
which is what to do when the developer wants "every app" rather than a feature around one app.
This is the Apps API, not the prebuilt UI: every screen is still this product’s own.

## 1. Find apps

```bash
curl 'https://flow.sokt.io/func/scri12BSufQM?key=<what the user typed>'
# { success, data: [{ service_id, name, iconurl, description }] } — best 30 matches, no paging
```

`data` is the best 30 matches, as `{ service_id, name, iconurl, description }`. There is no paging
and an empty key returns nothing, so this is a **type-ahead**, not a "list everything" call: put a
search box in front of it and query as the user types (debounce ~250 ms). It matches descriptions
too, so when you need one specific app, pick by `name`. Use `service_id` exactly as returned — the bare
`row…` string, never joined with the name — and `iconurl` as the app’s icon: in the grid, and on its Connect button.

To show every app — a grid, a panel, a directory — page through the full list instead:

```bash
curl 'https://plug-service.viasocket.com/api/v1/plugins/all?limit=200&offset=0'
# { data: [{ rowid, name, description, appslugname, iconurl, category, domain, brandcolor }] }
# rowid is the service_id. Ordered by popularity; limit is capped at 200; add &category=CRM to narrow.
```

`data` starts with the most used apps, and `rowid` is the `service_id` endpoint 2 takes. Page by `offset`
until a page comes back empty. It is viaSocket’s whole app table, about 7,500 rows, and it lists apps
that have nothing published yet: under a third of the rows has actions or triggers (that is the 2,300+),
and the empty ones are spread through the list, more of them further down. It takes no filter for
that, so drop an app whose endpoint 2 list is empty — lazily, when its card is opened, or once in a
nightly job that stores the ids worth showing. For a search box, the search above already returns
published apps only.

## 2. Every action and trigger of one app

```bash
curl -X POST 'https://flow.sokt.io/func/scriK4LFg2kc' \
  -H 'Content-Type: application/json' \
  -d '{ "service_id": "<service_id>" }'
# { service, actions, triggers } — the app once, then every published action and trigger
```

The response is `{ service, actions, triggers }`: the app once, then one entry per published action
and one per published trigger. `service`:

| field | meaning |
| --- | --- |
| `service_id` | The app’s id — what the search returned, and what every per-app call takes, exactly as returned: a bare `row…` string, never joined with the app’s name or slug. |
| `name` | The app’s display name. `null` when the id is unknown: treat that as “no such app”. |
| `description` | One paragraph about the app. |
| `icon_url` | The app’s icon — the same URL the search and the app list call `iconurl`. Show it on the Connect button and beside the name wherever the app is listed; a text-only button is a decision to report. |
| `auth_type` | How the app authenticates, e.g. `Auth2.0`, `apikey`, `NoAuth`. Connect handles it; the one place to pass it on is the trigger sample call’s `authType`. |
| `requires_auth` | `false` for an app without sign-in: no connect button, and the string `NoAuth` wherever a call takes an `auth_id`. |

Each entry of `actions` and of `triggers`:

| field | meaning |
| --- | --- |
| `action_id` · `trigger_id` | The action’s or trigger’s own id. Stable; use it as your key. It is what an automation’s `trigger_id` and `action_id`, the prebuilt UI’s `open: { actionId }` / `{ triggerId }` and `filteredServices`, and the connect popup’s `filteredActions` take. |
| `action_version_id` · `trigger_version_id` | What the run, list-options and subscribe-event calls take — and only those. Looks like the id above; is not interchangeable with it. |
| `name` | Display name, e.g. "Send Message". |
| `description` | One sentence, for a list or a tooltip. |
| `input_schema` | The full input schema: `{ steps, blocks }`. Render a form from it (the form-renderer document), or read it to shape `inputData`. A `dropdown` / `multiselect` block with no `options` (or with `enableSearchApi` / `willDynamicFetchOptions`), and an `input groups` block with no children in `steps`, is a picker: fill it with `list-options`. The schema carries no generator code. |
| `sample_output` | A real response of the action, or a real event payload of the trigger, from some account. Absent on some. For a trigger, the sample call (below) returns one for a given connection and `inputData` instead. |
| `updated_at` | When the version last changed; a cache key. |
| `polled` | Triggers only. Not reliable yet — it is `true` on every trigger. Ignore it. |

The version id is what the three Apps API calls take: `POST /embed/list-options/<action_version_id>` to fill a
picker, `POST https://flow.sokt.io/func/<script_id>` with `{ action_version_id, inputData }` to run an action,
`POST /embed/subscribe-event/<trigger_version_id>` to subscribe to a trigger. Everything else — an automation’s
trigger and steps, the prebuilt UI, the connect popup — takes the `action_id` / `trigger_id` instead. The per-app
document explains each of those calls in full; this document is about getting the list and the
schema without it.

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

## 3. From an entry to a working form

`input_schema` is `{ steps, blocks }`: `steps.root` is the ordered list of top-level fields, each block
has a `type` (`text`, `dropdown`, `input groups`, …), a `label`, `help`, `required`, `dependsOn` and an optional
`visibilityCondition`. The fields whose values come from the user’s own data (which channel, which sheet)
are the ones with no fixed `options`: a `dropdown` or `multiselect` without `options`, or an `input groups`
block without children in `steps`, is a picker, and a form fills it with `list-options` — the code viaSocket
runs for it is not in the schema. One renderer over that shape serves every action of every
app; it is specified, with a runnable engine and a React skin, in https://flow.viasocket.com/documentation/form-renderer.md.

For a picker field, fetch its choices with the user’s embed token:

```bash
curl -X POST 'https://flow-api.viasocket.com/embed/list-options/<action_version_id>' \
  -H 'Content-Type: application/json' \
  -H 'authorization: <embed token for this user>' \
  -d '{ "auth_id": "<auth_id>", "field_key": "<block key>", "existingFields": { "<dependency>": "<value>", "_searchText": "<typed text, when the block has enableSearchApi>" } }'
```

The response is `{ success, data }` with the list as `data`, or wrapped as `data.data`. A connection that cannot be read (revoked, or another user's `auth_id`) is answered with **200 and `success: true`**, the failure nested as `data.response.status` 400 and `data.response.data.message`. Treat that as the error it is; never render it as an empty list.

`sample_output` is what the action really returned, or what the trigger really delivered, on a real
run — in some account. Show it as an example next to the form. To map an event into another action’s
`inputData`, or into an automation’s steps, fetch one for the connection in question instead:

### A real event of a trigger, for one connection

```bash
curl -X POST 'https://flow.sokt.io/func/scrijZpnr8zJ?action_id=<trigger_id>&auth_id=<auth_id>&authType=<service.auth_type>' \
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

## 4. Every app in this product’s UI

The recipe, and what each step calls:

| screen | call | what to store |
| --- | --- | --- |
| Search box → app grid (icon, name) | endpoint 1 as the user types; or the full list, paged, for a directory | nothing |
| App page: a Connect button | the connect popup with the user’s embed token and, as `filteredActions`, the `action_id`s of the actions the user chose — so the consent screen asks only for their scopes (the app’s document, Step 1: `https://flow.viasocket.com/documentation/<service_id>.md`) | `auth_id` per user and app |
| App page: actions and triggers as a list | endpoint 2, cached per `service_id` | nothing |
| Action chosen: the form | render `input_schema`; `list-options` for its pickers | the `inputData` the user built |
| Run it | enable once (→ `script_id`; `NoAuth` as the `auth_id` for an app without sign-in), then the run call with `action_version_id` + `inputData` | `script_id` per user and app, server-side |
| Trigger chosen: the form + "what happens" | subscribe with `inputData` and a handler | the subscription record the app’s document describes (`https://flow.viasocket.com/documentation/<service_id>.md`, under Triggers) |

A backend module that does the listing:

```js
// Public, no token. Cache per app; ids are stable, schemas change rarely.
export async function listApps({ offset = 0, category } = {}) {
  const params = new URLSearchParams({ limit: '200', offset: String(offset) })
  if (category) params.set('category', category)
  const res = await fetch('https://plug-service.viasocket.com/api/v1/plugins/all?' + params)
  const { data } = await res.json()
  return data // [{ rowid (= service_id), name, iconurl, category, … }], most popular first
}

export async function searchApps(query) {
  const res = await fetch('https://flow.sokt.io/func/scri12BSufQM?key=' + encodeURIComponent(query))
  const { data } = await res.json()
  return data // [{ service_id, name, iconurl, description }]
}

export async function listVersions(serviceId) {
  const res = await fetch('https://flow.sokt.io/func/scriK4LFg2kc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: serviceId })
  })
  // { service:  { service_id, name, icon_url, auth_type, requires_auth },
  //   actions:  [{ action_id, action_version_id, name, description, input_schema, sample_output }],
  //   triggers: [{ trigger_id, trigger_version_id, name, description, input_schema, sample_output }] }
  const { service, actions = [], triggers = [] } = await res.json()
  if (!service?.name) return null // unknown service_id: the API answers 200 with an empty service
  return { service, actions, triggers }
}
```

Everything the end user’s data touches — connect, list-options, enable, run, subscribe — carries
the user’s embed token or `script_id` and is described, per call, in any app’s document
(`https://flow.viasocket.com/documentation/<service_id>.md`). Fetch one, for any app, to see the calls once; they are
identical for every app, which is the point.

## Rules

- The three catalog endpoints are public and unauthenticated: call them from the browser or the server, but
  never put an embed token in a call to them — they do not take one. The trigger sample call takes no
  token either, but its `auth_id` is a credential: server or terminal only, never from the browser.
- A `service_id` is used exactly as returned — a bare `row…` string. Never the app’s name or slug, never
  the id with a name joined on (`rowbu58rc_gmail`): the popup and the prebuilt UI then open on nothing.
- Every app comes with an icon (`iconurl` here, `icon_url` on `service`): show it beside the name and
  on the Connect button.
- Cache endpoint 2 per `service_id` (a day is fine); ids are stable and schemas change rarely. Do
  not hardcode an `action_version_id` in code: read it from the entry you rendered.
- The search returns the best 30. If a product needs a fixed set of apps, keep their `service_id`s in
  its own configuration and skip the search.
- An app with nothing published returns empty `actions` and `triggers`; an unknown `service_id` returns a
  `service` whose `name` is `null`. Hide both.
- Search text for a picker goes inside `existingFields` as `_searchText`, never at the top level.

