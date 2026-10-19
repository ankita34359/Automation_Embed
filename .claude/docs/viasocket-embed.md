---
name: viasocket-prebuilt-ui
description: >-
  Mount viaSocket’s prebuilt integrations UI inside this product — a ready-made screen for every
  app in the catalog with the connect flow, the action list and a working form for each — as a
  component in any box, configured from this product’s own code, and opened on as much or as
  little as the product wants: the whole catalog, one app, one action’s form, or one flow the
  user built before. End users connect, pick and build their automations in it, and this product
  listens for what they publish. The same apps, flows and events are reachable through the Apps
  API, in this product’s own screens.
---

# The prebuilt UI

> Source: https://flow.viasocket.com/documentation/embed.md?org=80141&project=projKcrymrh3. Public, no sign-in. Fetch it
> again for the latest version of this file.
> Part of viaSocket. Start at the skill, https://flow.viasocket.com/documentation/skill.md — setup, every capability, the rules. Every document: https://flow.viasocket.com/documentation/index.md.

Every app, every action, every form, already built: viaSocket renders the whole integration
experience inside your product. Your code mounts one script with a per-user token, tells it how to
look and behave, and listens for what the user publishes. There is no per-app code, and you never
hold a third-party credential.

**It is configured from your code.** Everything — which apps it offers, whether it runs in
agent-tools mode, whether your own product is the first app — is a `config`
object your page passes. What you save on the viaSocket dashboard is only the default for keys
your code does not set. Nothing has to be configured on the dashboard.

| At a glance |  |
| --- | --- |
| Runs on | The same embed, ids and token as the Apps API. Nothing extra is created. |
| Your users | Connect their own apps and build their own flows in our UI, inside your product |
| You write | A box in your own UI, one script tag, one `config` object, one message listener |
| You store | Depends on what they build — section 6 |

## Next to the Apps API

The prebuilt UI and the Apps API reach the same connections, the same token and the same flows;
nothing one creates is hidden from the other, and a product can use both. They differ in who
draws the screens and who decides what a flow does:

|  | Prebuilt UI | Apps API |
| --- | --- | --- |
| The screens | viaSocket’s, in a box of this product’s page: catalog, connect, forms and pickers, the user’s list, history | This product’s own, rendered from each action’s schema — only what the use case needs |
| Who decides what a flow does | The end user, in the builder — within the app, action or flow this product opens it on | This product’s code, from what the user filled in its screens |
| What this product writes | A mount, a `flow` listener, and what it stores from the events | Connect, pickers, run, subscribe, and the screens around them |
| Wording, apps shown, theme | Config keys (section 4), set from code | Entirely this product’s |
| Where each is read | This document | https://flow.viasocket.com/documentation/<service_id>.md per app; https://flow.viasocket.com/documentation/catalog-api.md for every app |

A chat assistant in this product’s own UI — viaSocket runs it per user, with this product’s endpoints as its tools — is the AI API: https://flow.viasocket.com/documentation/ai.md. It is not `chatbot: true` here, which is the end user’s own assistant building flows in these screens.

## Rules that are not negotiable

1. **The signing secret stays on your server.** Every embed token is signed there, per user, on
   demand. The browser gets one token for one page load and never the secret.
2. **One `unique_identifier` per end user, forever.** Every connection and flow is isolated by it;
   change it and the user appears to have lost everything.
3. **Check `event.origin` before trusting a message** from the embed. It is always
   `https://embedfrontend.viasocket.com`.
4. **Key everything you store by `flow.id`.** It is stable across every event for that flow, and it is the flow’s `script_id` — the id the embed API’s flow calls and `open: { flowId }` take.
5. **A flow URL runs the user’s apps.** Store it server-side like a credential; never ship it to the browser.
6. **Nothing is created on viaSocket for this.** The embed exists; you need its two ids and its secret,
   from the developer. There is no login token in this work.
7. **What the user builds reaches your product only through the `flow` events** (section 5). Nothing
   is pushed to your backend: without a listener, flows get built, paused and deleted and your
   product never learns of it.

## 1. Your ids

This document was generated for embed `projKcrymrh3` in organisation `80141`. Put both in your server-side environment as `VIASOCKET_ORG_ID` and `VIASOCKET_PROJECT_ID`.

Ask for the signing secret the same way and have the developer put it in `.env` as `VIASOCKET_EMBED_SECRET`.
Never write it into a file in the repo.

## 2. The embed token (per end user)

A JWT your backend signs with the org secret. The three claims are the whole payload.

```text
algorithm: HS256
payload:   { "org_id": "80141", "project_id": "projKcrymrh3", "unique_identifier": "<your stable id for this user>" }
secret:    VIASOCKET_EMBED_SECRET
```

```js
// Node. Any language’s JWT library does the same three-claim HS256 sign.
import jwt from 'jsonwebtoken'
export function embedToken(uniqueIdentifier) {
  return jwt.sign(
    { org_id: process.env.VIASOCKET_ORG_ID, project_id: process.env.VIASOCKET_PROJECT_ID, unique_identifier: uniqueIdentifier },
    process.env.VIASOCKET_EMBED_SECRET
  )
}
```

Expose it as an endpoint on your backend that only the signed-in user can call, and have the page
fetch it right before mounting the UI.

## 3. Mount it — a component in a box of yours

The prebuilt UI is one thing: a component that fills whatever element it is given. Your page decides
the box — a settings page, a tab, a drawer, a modal — and your own UI opens and closes that box. The
runtime draws nothing outside it: no header, no button, nothing floating over your page.

Two parts: the component, and a `flow` listener through which what the user builds reaches your
product (section 5). `open` says where the user starts — the catalog, one app, one action’s form,
one flow — so a user who came to do the Slack thing need not find Slack among 2,300 apps first.

```html
<!-- Wherever your product wants it: a page, a tab, your own drawer or modal. Give it a height. -->
<div id="integrations" style="height: 640px"></div>

<script src="https://embed.viasocket.com/prod-embedcomponent.js"></script>
<script type="module">
  // Per user, from your backend’s token endpoint, which answers { token } (the skill’s Setup).
  const { token: embedToken } = await fetch("/api/viasocket/token").then((r) => r.json())
  const embed = viaSocket.mount({
    embedToken,
    parent: "#integrations",
    config: {}
    // Where the user starts (the table below): the catalog when omitted, or
    // open: { serviceId } · { actionId } · { triggerId } · { flowId } · { templateId }
  })

  // Not optional: what the user builds reaches your product only through this.
  embed.on("flow", (flow) => {
    // flow.action: initiated | published | updated | paused | deleted
    // Every field is in section 5; what to store for your configuration is section 6.
  })
</script>
```

### Where it opens, and how much of it shows

The UI is as big or as small as the product wants. Ids come from the catalog API: an app’s
`service_id` from the search, an action’s `action_id` or a trigger’s `trigger_id` (not its version id) from the app’s
rows (https://flow.viasocket.com/documentation/catalog-api.md). A flow’s id is what the `flow` event delivered when it was created.

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

| Open it on | `open` | What fills the box |
| --- | --- | --- |
| The whole catalog | nothing — or `config.filteredServices` to narrow it | search, every app, the user’s own list of enabled apps and flows (`showEnabled`), templates and combinations if turned on |
| One app | `{ serviceId }` | that app’s triggers and actions, Connect inside; the user picks what to build |
| One action’s form | `{ actionId }` | a flow is created with that action, this product’s webhook as its trigger, and the form opens: the connection picker, the action’s fields with pickers filled from the user’s account, Publish. The `initiated` event carries the flow id |
| One trigger | `{ triggerId }` | a flow is created that starts from that event of the user’s app, open on the trigger’s form; the user adds what happens next |
| A flow built before | `{ flowId }` — the id from the `flow` event | that flow as the user left it: the same form, editable, with its status |
| A template | `{ templateId }` | a flow created from it |
| A run’s log | `{ flowId, flowHitId }` | that flow on the log of one run |

With `config.showEnabled: false` and `hideadvancedflowbutton: true`, opening on an action or a flow
shows the form alone — title, Publish, the form — with no Back button and no switch to the multi-step
editor, which is the shape for a product that keeps its own UI around the box and reopens each
saved flow by its id. The same keys with `showEnabled: true` give the user the way back to their list.
A flow this product built from code with the Automation API (https://flow.viasocket.com/documentation/automations.md) is the same
kind of flow: `open: { flowId: "<its script_id>" }` shows it to the user, editable, and its runs are in History.
The other things a request tends to name:

| The request | Config |
| --- | --- |
| "only Slack", "only these apps" | `filteredServices` with those apps (and `open: { serviceId }` on the one that matters) |
| "tools for our AI agent" | `{ chatbot: true }` |
| "our product as the first app" | `{ serviceId: "<your connector>", serviceType: "both" }` |
| "the connection and the fixed values are already known" | `configurationJson` on the open call (section 6) |

Or declaratively — the script tag with attributes. `parentId` names the box and `config` is the same object as
JSON, with `"type": "all_space"` said explicitly: the attribute form predates the component and does not imply it.

```html
<div id="integrations" style="height: 640px"></div>
<script
  id="viasocket-embed-main-script"
  src="https://embed.viasocket.com/prod-embedcomponent.js"
  embedToken="<token from your backend for this user>"
  parentId="integrations"
  config='{"type":"all_space"}'>
</script>
```

The runtime API, on `window.viaSocket`:

| call | what it does |
| --- | --- |
| `viaSocket.mount({ embedToken, parent, config, open? })` | Mounts the component in `parent` (an element or a selector) and returns it. Several boxes on one page: call it once per box. `open` takes the options of `embed.open` below, for a component that should start on one flow, a template or one app. |
| `embed.update(config)` | Changes config at runtime; the UI picks it up without a reload. |
| `embed.on("flow", fn)` | A typed listener for the events in section 5. `"ready"` and `"error"` also fire. |
| `embed.open(flowId, options?)` | Jump to one flow, or open with the options below (a template, a prefilled connection, sample data). |
| `embed.send(data)` | Arbitrary data to the UI. |
| `embed.destroy()` | Remove it from the page — when your drawer or modal is torn down. |

Options of `embed.open(flowId?, options?)` — also accepted as `open: { flowId, ... }` on `mount`. All optional,
and the same ones a page written against the previous runtime passes to `openViasocket(flowId, options)`:

| option | type | what it does |
| --- | --- | --- |
| `flowId` | string | Open a specific flow directly instead of the flow list. |
| `flowHitId` | string | Open the embed on a particular flow execution log. |
| `dummy_payload` | object | Sample JSON payload so your users get auto-suggestions while mapping fields. |
| `meta` | string | Extra metadata to store with the flow — user plan, source, internal tags. |
| `create_default_flow_with_api` | boolean | Create and open a default API-type flow straight away. |
| `create_default_flow_with_function` | boolean | Create and open a default Function-type flow straight away. |
| `templateId` | string | Create a flow from an existing template instantly. |
| `serviceId` | string | Open a specific app inside the embed: its `service_id` exactly as the app search returns it — a bare `row…` string, never the app’s name or slug, never the id with a name joined on. |
| `actionId` | string | Open straight onto one action’s form: a flow is created with that action, your webhook as its trigger, and lands on the form. The action’s `action_id` from the catalog API (not its `action_version_id`). The `initiated` event carries the flow id to reopen it with `flowId`. |
| `triggerId` | string | Open straight onto one trigger: a flow is created that starts from that event of the user’s app, and lands on the trigger’s form. The trigger’s `trigger_id` from the catalog API (not its `trigger_version_id`). |
| `configurationJson` | object | Prefill the connection and input fields for your integration. |
| `configurationJsonEncrypted` | string | Same as configurationJson but encrypted — use this in production. |
| `embed_in_llm` | boolean | Controls whether "Fill with AI" is available to the user inside the embed. |
| `config` | object | Any key from section 4, applied first. |

The token is per user and per page load. Never sign it in the browser. Give the box a height: the
component fills its parent, and a parent with no height is an empty strip.

## 4. Configure it from your code

Precedence, lowest to highest: the runtime’s defaults, what the dashboard saved for the embed, then
what your code passes. So the dashboard is a place to set defaults for every page, and your code is
the source of truth wherever it says something. Keys your code does not mention keep their saved
value.

| key | type | default | what it does |
| --- | --- | --- | --- |
| `pageheading` | string | `"Integration"` | **The noun the UI uses for one thing a user builds — singular.** It is written into every title: "Add New {pageheading}", "Enabled {pageheading}s", "Customized {pageheading}s", "Add Custom {pageheading}". `"Automation"` reads "Add New Automation / Enabled Automations". A sentence here breaks every title; a sentence goes in `pagesubheading`. |
| `pagesubheading` | string | `"Enhance your experience with a diverse range of powerful integrations."` | The line under the title on the catalog screen, and in the empty state when the user has nothing yet. |
| `showSubHeading` | boolean | `true` | `false` drops that line. |
| `helpdoclink`, `helpdoctitle` | string, string | none | A link at the top right, opened in a new tab. Both are needed or nothing shows. |
| `showEnabled` | boolean | `true` | Land on the user’s own list — "Enabled {pageheading}s" (one row per app they enabled) and "Customized {pageheading}s" (flows they built) — with a way into the catalog. `false` lands on the catalog and also removes the Back button from a flow’s page — what a product wants when it opened the UI on one action or one flow and its own UI is around the box. **The list shows every flow of this user in this embed, including the ones the Apps API created** (`enable`, `subscribe-event`; they are titled by service id). Mounting this UI on an embed the product also uses through the API for the same users means `showEnabled: false`, or a second embed for the UI. |
| `filteredServices` | object | `{}` (everything) | Restrict the catalog: `{ "<service_id>": { "<event rowid>": true } }` — an app is offered once it has at least one action or trigger listed. Ids come from the catalog API (each action’s `action_id` or trigger’s `trigger_id`, not its version id). |
| `hideApps` | boolean | `false` | Hide the whole catalog (search and grid). What remains is whatever the other keys turn on: templates, the webhook / API / function cards. |
| `hideWebhook` | boolean | `false` | Hide the "Webhook" **and** the "Repeater/Scheduler" cards — one flag for both. |
| `hideApi` | boolean | `false` | Hide the "HTTP/API Request" card. |
| `hideFunction` | boolean | `false` | Hide the "Custom Logic (JS)" card **and** the dashed "Add Custom {pageheading}" card. |
| `showAskAItoFlow` | boolean | `false` | An "Ask AI" button beside the search box: the user describes what they want and a flow is drafted for them. |
| `showTemplates`, `templatesHeading` | boolean, string | `false`, none | A row of ready-made templates under the catalog, with its own heading. |
| `chatbot` | boolean | `false` | **Agent-tools mode.** Every published flow also carries `mcpToolJson` and `openaiToolJson`, and the user gets "Fill with AI" while building. Set it when the flows are tools for your AI agent. |
| `llm_referring_text` | string | `"Fill with AI"` | With `chatbot`: the label of that checkbox, so it can name your assistant ("Let Acme fill this in"). |
| `serviceId`, `serviceName`, `serviceType` | string, string, `"trigger"` \| `"both"` | `"webhook"`, `"webhook"`, `"trigger"` | **Your own product as the first app.** Set `serviceId` to your connector’s service id (from Plug Builder) and `serviceType` to `"both"`: flows then start from an event in your product, or in any app the user connects. |
| `directFlow` | boolean | `false` | Skip the list and open a new flow at once. Pair it with `serviceId` or a single `permittedEvents` entry. |
| `permittedEvents` | `"all"` \| string[] | `"all"` | With your own connector: which of its events the user may start from. |
| `hideadvancedflowbutton` | boolean | `false` | Inside a flow: hide the switch from the simple form to the advanced multi-step editor. |
| `themeJson` | object | none | CSS variables applied to the UI, e.g. `{ "--primary-color": "#1B3FA0", "--font-family": "Inter" }`. Only variables the UI defines take effect. |

### What the user sees first

With `showEnabled: true` (the default): their own list — "Enabled {pageheading}s", one row per app
they enabled, and "Customized {pageheading}s", the flows they built — and, when it is empty, one
card with the subheading and a "Browse integrations" button. From there, the catalog.

With `showEnabled: false`: the catalog straight away — "Add New {pageheading}", the subheading, a
search box, the app grid, and the Webhook / Repeater / HTTP request / Custom logic cards, each of
which has a `hide…` key above.

Under the list screen there is a footer strip — "2,300+ Available Apps · 100% Secure · 24/7 Support".
The first cell goes away when `filteredServices` narrows the catalog; the strip itself has no key.

Three configurations cover what used to be three separate kinds of embed:

| you want | config |
| --- | --- |
| Your users build flows that your code runs (webhook trigger, one URL per flow) | `{}` — the default |
| Your users set up tools for your AI agent | `{ "chatbot": true }` |
| Your own product as the first app, flows between it and the user’s apps | `{ "serviceId": "<your connector>", "serviceName": "<its slug>", "serviceType": "both" }` |

Change it at runtime — a settings toggle, a different page, a different plan:

```js
embed.update({ chatbot: true, filteredServices: { "<service_id>": { "<event_id>": true } } })
```

## 5. Listen for what the user publishes

The embed posts a message to the parent window on every change to a flow.

```html
<script>
  window.addEventListener('message', (event) => {
    if (event.origin !== "https://embedfrontend.viasocket.com") return;
    const flow = event.data;
    if (!flow?.id) return;
    // flow.action -> initiated | published | updated | paused | deleted
    // flow.webhookurl, flow.payload, flow.mcpToolJson, flow.openaiToolJson, flow.title, flow.serviceIcons
    // What to do with each is section 6.
  });
</script>

<!-- Or the typed listener, same events, bound to one component: -->
<script>
  embed.on('flow', (flow) => { /* same object */ })
</script>
```

| `action` | `status` | What happened |
| --- | --- | --- |
| `initiated` | `drafted` | A user started building a flow. No webhook URL is live yet. |
| `published` | `active` | A user published the flow. This is the event where you store the URL. |
| `updated` | `active` | A published flow was edited. Only fires for already-active flows. |
| `paused` | `paused` | A user paused the flow. Stop calling the URL until it is active again. |
| `deleted` | `deleted` | A user deleted the flow. Drop the stored URL. |

Every field on the message:

| field | meaning |
| --- | --- |
| `webhookurl` | The URL to call to run this flow. This is the value you need to store. |
| `action` | Which event this is: initiated \| published \| updated \| paused \| deleted. |
| `status` | Flow state after the event: drafted \| active \| paused \| deleted. |
| `id` | The flow id. Use it as your storage key — it is stable across events. |
| `title` | Flow title your user typed. |
| `description` | Flow description your user typed. |
| `payload` | The request body this flow expects, derived from what the user mapped. |
| `sampleDataFromTriggerInBody` | Sample trigger data, useful for showing your users an example. |
| `mcpToolJson` | MCP tool definition (name, description, inputSchema) for this flow. |
| `openaiToolJson` | The same schema shaped as an OpenAI function tool. |
| `staticVariables` | Static variables saved on the published flow. |
| `detailedUsedVariables` | Detailed breakdown of the variables the flow consumes. |
| `serviceIcons` | Icon URLs of the apps used in the flow, for rendering it in your own UI. |
| `metadata` | Whatever you passed as `meta` when opening the embed. |

## 6. Use what they built

What a published flow is for follows from the configuration you mounted with. One of these three:

### Your code runs the flow (the default configuration)

On `published` and `updated`, store `flow.webhookurl` and `flow.payload` against the user, keyed by
`flow.id`. When the event happens in your product, POST to that URL with a body in the shape
`payload` described. The response body is the flow’s output.

The event arrives in the browser, so the browser hands `flow.id` to your backend and the backend reads
the flow itself — `GET https://flow-api.viasocket.com/projects/projKcrymrh3/integrations` with the user’s embed token, `data.flows[]`
with that `id`, its status and URL — rather than trusting a URL the browser forwarded.

```js
// Run a flow your user published.
// Use the exact URL you received in flow.webhookurl. It always looks like this,
// where <flow_id> is the flow.id from the same event:

await fetch('https://flow.sokt.io/func/<flow_id>', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // Use the shape you received in flow.payload for this specific flow.
    order_id: '12345',
    customer_email: 'jane@example.com'
  })
});
```

Every flow URL looks like `https://flow.sokt.io/func/<flow_id>`. Stop calling it on `paused`; delete your record on `deleted`.
The listener for exactly this:

```html
<script>
  window.addEventListener('message', (event) => {
    // Always check the origin before trusting the message.
    if (event.origin !== "https://embedfrontend.viasocket.com") return;

    const flow = event.data;
    if (!flow?.id) return;

    // What you get:
    //   flow.id         -> stable id, use it as your storage key
    //   flow.webhookurl -> https://flow.sokt.io/func/<flow_id>  (POST here to run the flow)
    //   flow.status     -> drafted | active | paused | deleted
    //   flow.payload    -> the request body this flow expects
    //   flow.title      -> the name your user gave it

    switch (flow.action) {
      case 'published':
      case 'updated':
        // YOUR CODE: save flow.webhookurl against this user, keyed by flow.id.
        // This URL is the only way to run the flow — if you don't store it, nothing works.
        break;

      case 'paused':
        // YOUR CODE: keep the record, but stop calling the URL.
        break;

      case 'deleted':
        // YOUR CODE: delete your stored record for flow.id.
        break;

      case 'initiated':
        // A draft: no live URL yet. Store flow.id if your UI lists drafts or reopens them (open: { flowId }).
        break;
    }
  });
</script>
```

### The flows are tools for your agent (`chatbot: true`)

On `published` and `updated`, store `flow.openaiToolJson` (or `flow.mcpToolJson` for an MCP server)
and `flow.webhookurl`, keyed by `flow.id`, for that user. Register the stored tools with your agent
for that user. When the model calls one, POST the arguments it produced to the flow’s URL and
return the response body as the tool result.

**What your users do.** In the prebuilt UI they pick an app, connect it, then either *let the
assistant use it* — they choose the actions it may perform; one tool per app, whose arguments are
`instructions`, `action_name` and `thread_id` — or *set up one action* — they fill the fixed
details (which channel, which sheet) and leave the rest for the assistant; one tool per action,
whose arguments are exactly the fields they left open. When they publish, they give it a name and
a description, and are told those are what your model reads.

**What the tool is.** `name` is the flow’s title, normalised to letters, digits and underscores
(what every model accepts) and unique per user. `description` is what the user wrote.
`parameters` / `inputSchema` are the fields left to the assistant. A rename arrives as `updated`
with a new `name` for the same `flow.id`: replace that tool, do not add a second one.

```js
// 1. Give your model the tool definitions you captured.
//    Pass the flow.openaiToolJson values you stored as the model's "tools" array
//    (or flow.mcpToolJson if you're exposing them through an MCP server).

// 2. When the model calls one, POST the arguments it produced to that flow's URL.
//    Look up the URL you stored for that tool — it always looks like this:

const response = await fetch('https://flow.sokt.io/func/<flow_id>', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(argumentsFromTheModel)
});

// 3. The response body is the flow's output — return it to the model as the tool result.
const result = await response.json();
```

Remove the tool on `paused` and `deleted`. `openaiToolJson` is `{ type: "function", function: { name,
description, parameters } }`; `mcpToolJson` is `{ name, description, inputSchema }`. Both are generated
from what the user mapped, so the schema is exactly the body the flow expects. The listener for this:

```html
<script>
  window.addEventListener('message', (event) => {
    // Always check the origin before trusting the message.
    if (event.origin !== "https://embedfrontend.viasocket.com") return;

    const flow = event.data;
    if (!flow?.id) return;

    // What you get, already built for you:
    //   flow.mcpToolJson    -> { name, description, inputSchema }
    //   flow.openaiToolJson -> { type: 'function', function: { name, description, parameters } }
    //   flow.webhookurl     -> https://flow.sokt.io/func/<flow_id>  (POST the tool arguments here)

    switch (flow.action) {
      case 'published':
      case 'updated':
        // YOUR CODE: store the tool definition + flow.webhookurl, keyed by flow.id,
        // then expose it to your agent as an available tool.
        break;

      case 'paused':
      case 'deleted':
        // YOUR CODE: remove this tool so your agent stops offering it.
        break;

      case 'initiated':
        // Still being built — no schema worth registering yet.
        break;
    }
  });
</script>
```

### Your product is the first app (`serviceId` set to your connector)

Nothing has to be stored: viaSocket runs these flows, from the event in your product or in the
user’s app. Use the events to show state in your own UI (a badge, a list of the user’s automations).
Your product has to be published as a connector in Plug Builder first; the `serviceId` is its service
id there. Do not use a public app’s id.

When your product already knows the connection or the values a flow should start with, pass them
when opening so the user does not type them again:

```js
// `embed` is what viaSocket.mount returned; the same options also go in mount’s `open`.
embed.open(undefined, {
  serviceId: "<the app to open>",
  configurationJson: {
    ...
  }
})
```

`actionId` in place of `serviceId` opens that one action with the values already in its form.
The shape of `configurationJson`:

```json
{
  "authValues": { },    // Credentials
  "stepId": {
    "key": "action_name",
    "inputValues": { }  // Pre-filled data for this step
  }
}
```

```json
"authValues": {
  "api_key": "your_api_key_here",
  "workspace_id": "workspace_123"
}
```

In production send `configurationJsonEncrypted` instead: the same JSON, AES-encrypted with your org
secret so credentials never travel in clear text through the browser. The Node version:

```js
const crypto = require('crypto');

function encryptMessage(message, secret_key) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);

  const keyBytes = crypto.pbkdf2Sync(secret_key, salt, 100000, 32, 'sha256');

  const cipher = crypto.createCipheriv('aes-256-cfb', keyBytes, iv);
  let encrypted = cipher.update(message, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return Buffer.concat([salt, iv, Buffer.from(encrypted, 'base64')]).toString('base64');
}

const configurationJson = {
  authValues: { "field1": "field value" },
  inputValues: { "field1": "field value" }
};

// pass the secret key that you got while jwt token generation
const secret_key = "your-secret-key";

const encrypted = encryptMessage(JSON.stringify(configurationJson), secret_key);

console.log('Encrypted:', encrypted);
```

The dashboard’s Prebuilt UI guide has the same routine in Python, Java, PHP and Ruby.


## 7. Manage what a user built

All of these take the user’s embed token as the `authorization` header, so they answer for that user only.

| call | what it is for |
| --- | --- |
| `GET https://flow-api.viasocket.com/projects/projKcrymrh3/integrations` | Every flow this user has in this project, with status and URL. |
| `PUT https://flow-api.viasocket.com/projects/updateflowembed/<flow_id>` | Rename a flow or change its `meta`: body `{ title, description, meta }`. |
| `PUT https://flow-api.viasocket.com/embed/updatestatus/<flow_id>?status=2` | Pause a flow: a run then answers 400 “Flow is currently paused”. `status=0` deletes it (“Flow has been deleted”); `status=1` resumes a paused flow or restores a deleted one. |
| `GET https://flow-api.viasocket.com/embed/authentications` | Every app this user has connected. |
| `DELETE https://flow-api.viasocket.com/embed/authentications/revoke/<auth_id>` | Disconnect an app. Pause the flows built on it first. |

## Verify before you say it works

1. Sign a token for a test user (section 2) and load the page: the UI renders inside your box and shows the app list.
2. Change one config key from code (`embed.update({ chatbot: true })`): the UI picks it up without a reload.
3. Build and publish one flow as the test user: your listener receives `published` with a `webhookurl`.
4. Do the thing section 6 says for your configuration — POST to the URL, call the tool, or trigger the flow — and see the response.
5. Pause it in the UI: your listener receives `paused`.
6. Run the check script over the code (`curl -fsSL https://flow.viasocket.com/viasocket-check.mjs -o viasocket-check.mjs && node viasocket-check.mjs src`): every id in `open` and `filteredServices` is resolved against the catalog, and a viasocket URL built by hand is flagged.

Report what actually came back; do not describe a step as working that you did not run.

## When it goes wrong

| symptom | cause |
| --- | --- |
| The UI shows "Could not load" or a blank box | The token was signed with the wrong secret, or a claim is missing or misspelt (`org_id`, `project_id`, `unique_identifier`). |
| Nothing shows | The box has no height — the component fills its parent. Give the box a height. Or `config` on the script tag is not valid JSON in single quotes. |
| It floats over the page instead of filling the box | No `parent` was given and a saved dashboard setting chose a floating `type`. Pass `parent` (or `parentId`); with a parent the component form wins. |
| A config key seems ignored | It is a saved default and your code did not set it — check the object you pass, not the dashboard. `serviceId` needs `serviceType: "both"` with it. |
| `open: { actionId }` or `{ triggerId }` lands on the catalog with an error toast | The id is not the catalog API’s `action_id` / `trigger_id` (the `action_version_id` is a different id), or the event is not published. |
| No message arrives | The listener checks the wrong origin, or is attached after the user published. Attach it before mounting. |
| A user cannot see their flows | A different `unique_identifier` was used for the same person. |
| POST to the flow URL fails | The body does not match `payload`, or the flow is `paused` / `deleted`. |
| A popup opened from your own button shows "Page not found" | The popup was opened to a viasocket URL built by hand. The connection popup is opened only by `openViasocketConnection` from the connect script (the Apps API document’s Step 1); the 404 page tells the opener so, as a `viasocket_connection_error`. |
| Your connector does not appear | It is not published in Plug Builder, or `serviceId` is a public app’s id rather than yours. |
| `open: { serviceId }` lands on an unknown app or an empty box | The id is not the bare `service_id` the search returned (`rowo0bqrhj5g`): a name, a slug, or the id with a name joined on (`rowbu58rc_gmail`). Use it exactly as returned. |

## Appendix — the runtime’s own floating overlays (legacy)

Pages written against the previous runtime let it float the UI over the page — a slider from the
right or left, a popup — hidden until `openViasocket()` and closed with `handleclose()`. That still
works, unchanged. A new integration does not need it: mount the component in your own drawer or
modal and let your UI open and close that. Documented here so an existing page can be read.

| key | type | default | what it does |
| --- | --- | --- | --- |
| `type` | `"all_space"` \| `"right_slider"` \| `"left_slider"` \| `"popup"` | `"all_space"` when a `parent` is given | `all_space` is the component. The others make the runtime float the UI over the page itself and hide it until `viaSocket.open()`. |
| `height`, `heightUnit`, `width`, `widthUnit` | number, `"px"` \| `"%"` | `100 %`, `40 %` | Size of a floating UI. A component takes its box’s size. |
| `buttonType`, `buttonName` | `"custom"` \| `"default"`, string | `"custom"`, `"Integrations"` | `default` adds a floating open button with that label. |
| `backdrop` | boolean | `false` | Dim the page behind a floating UI and close it on a click outside. |

```html
<button onclick="viaSocket.open()">Integrations</button>
<script src="https://embed.viasocket.com/prod-embedcomponent.js"></script>
<script>
  viaSocket.init({ embedToken, config: { type: "right_slider", width: 480, widthUnit: "px" } })
  // viaSocket.close() hides it again; the old globals openViasocket / handleclose do the same.
</script>
```
