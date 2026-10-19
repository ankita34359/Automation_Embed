import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CheckCircle2, Plug, MousePointerClick, Rocket, Settings2, Plus } from "lucide-react";
import { SLOTS } from "../../server/slots.js";
import { Badge, Button, Card } from "../components/ui.jsx";
import SlotModal from "../components/SlotModal.jsx";

const STATE = {
  active: ["green", "Active"],
  paused: ["amber", "Paused"],
  not_set_up: ["slate", "Not set up"],
};

const STEPS = [
  { icon: Plug, title: "Connect", text: "Sign in to Google (Sheets or Gmail) once, inside the setup window." },
  { icon: MousePointerClick, title: "Pick", text: "Choose the spreadsheet and tab, or the Gmail account, and map the sample fields." },
  { icon: Rocket, title: "Publish", text: "Press Publish. The card turns Active and registrations start flowing." },
];

function AppIcon({ src }) {
  const [broken, setBroken] = useState(false);
  return broken
    ? <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Plug className="h-5 w-5" aria-hidden="true" /></span>
    : <img src={src} alt="" onError={() => setBroken(true)} className="h-11 w-11 rounded-xl bg-white object-contain p-1.5 ring-1 ring-slate-200" />;
}

export default function Integrations() {
  const { summary, error, refresh } = useOutletContext();
  const [openSlot, setOpenSlot] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef();

  useEffect(() => { document.title = "Integrations · HireDrive"; }, []);

  const say = (msg) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 4000); };
  const close = useCallback(() => setOpenSlot(null), []);

  const onFlowSaved = useCallback((action) => {
    refresh();
    if (action === "published") { setOpenSlot(null); say("Saved"); }
    else if (action === "updated") say("Changes saved");
    else if (action === "paused") say("Paused. Registrations skip this step until you resume it.");
    else if (action === "deleted") { setOpenSlot(null); say("Removed"); }
  }, [refresh]);

  const stateOf = (slot) => summary?.slots.find((s) => s.slot === slot);
  const open = openSlot && SLOTS.find((s) => s.slot === openSlot);
  const activeCount = summary ? summary.slots.filter((s) => s.state === "active").length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="text-sm text-slate-500">Four small steps connect registrations to Google Sheets, Gmail and AI. {summary && <strong className="font-semibold text-slate-700">{activeCount} of 4 active.</strong>}</p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3" aria-label="How setup works">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title}>
            <Card className="h-full p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{i + 1}</span>
                <span className="flex items-center gap-1.5 font-semibold text-slate-900"><Icon className="h-4 w-4 text-indigo-600" aria-hidden="true" />{title}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{text}</p>
            </Card>
          </li>
        ))}
      </ol>

      {error && !summary && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-600/20">Couldn't load integration status: {error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {SLOTS.map((def) => {
          const s = stateOf(def.slot);
          const state = s?.state ?? "not_set_up";
          const [tone, label] = STATE[state];
          const configured = state !== "not_set_up";
          return (
            <Card key={def.slot} className="flex flex-col p-5" aria-labelledby={`t-${def.slot}`}>
              <div className="flex items-start gap-3">
                <AppIcon src={def.iconUrl} />
                <div className="min-w-0 flex-1">
                  <h2 id={`t-${def.slot}`} className="font-semibold text-slate-900">{def.title}</h2>
                  <p className="text-xs text-slate-500">{def.appName}: {def.actionName}</p>
                </div>
                <Badge tone={tone}>{state === "active" && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}{label}</Badge>
              </div>
              <p className="mt-3 flex-1 text-sm text-slate-600">{def.help}</p>
              <Button variant={configured ? "secondary" : "primary"} className="mt-4 w-full sm:w-auto sm:self-start" onClick={() => setOpenSlot(def.slot)} disabled={!summary}>
                {configured ? <><Settings2 className="h-4 w-4" aria-hidden="true" />Edit</> : <><Plus className="h-4 w-4" aria-hidden="true" />Set up</>}
              </Button>
            </Card>
          );
        })}
      </div>

      {open && <SlotModal key={open.slot} def={open} flowId={stateOf(open.slot)?.flow_id ?? null} onClose={close} onFlowSaved={onFlowSaved} />}

      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
        {toast && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />{toast}
          </div>
        )}
      </div>
    </div>
  );
}
