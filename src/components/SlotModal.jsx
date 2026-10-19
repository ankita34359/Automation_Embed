import { useEffect, useRef, useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { api } from "../lib/api.js";
import { loadEmbedScript } from "../lib/viasocket.js";
import { Spinner } from "./ui.jsx";

// Our modal around viaSocket's prebuilt UI. The box has a fixed height (the component fills its parent).
export default function SlotModal({ def, flowId, onClose, onFlowSaved }) {
  const boxRef = useRef(null);
  const dialogRef = useRef(null);
  const handlerRef = useRef();
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [ready, setReady] = useState(false);

  // Latest callbacks without remounting the embed.
  handlerRef.current = async (flow) => {
    if (!flow?.id || flow.action === "initiated") return;
    setSaveError("");
    try {
      await api("/api/viasocket/flow", {
        method: "POST",
        body: { slot: def.slot, id: flow.id, action: flow.action, status: flow.status, title: flow.title, webhookurl: flow.webhookurl, payload: flow.payload },
      });
      onFlowSaved(flow.action);
    } catch (err) {
      setSaveError(`Couldn't save this to HireDrive: ${err.message}`);
    }
  };

  useEffect(() => {
    let embed;
    let cancelled = false;
    (async () => {
      try {
        const vs = await loadEmbedScript();
        const { token } = await api("/api/viasocket/token"); // fetched right before mounting
        if (cancelled) return;
        const open = flowId
          ? { flowId }
          : { actionId: def.actionId, dummy_payload: def.dummy_payload, meta: def.slot };
        embed = vs.mount({
          embedToken: token,
          parent: boxRef.current,
          config: { showEnabled: false, hideadvancedflowbutton: true },
          open,
        });
        embed.on("flow", (flow) => handlerRef.current(flow)); // attached before the admin can publish
        embed.on("ready", () => setReady(true));
        embed.on("error", () => setLoadError("viaSocket reported a problem. Close this window and try again."));
        setTimeout(() => setReady(true), 4000);
      } catch (err) {
        setLoadError(err.message);
      }
    })();
    return () => {
      cancelled = true;
      try { embed?.destroy(); } catch { /* already gone */ }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="slot-title"
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <img src={def.iconUrl} alt="" className="h-7 w-7 rounded object-contain" />
          <div className="min-w-0 flex-1">
            <h2 id="slot-title" className="truncate text-base font-semibold text-slate-900">{def.title}</h2>
            <p className="truncate text-xs text-slate-500">{def.appName}: {def.actionName}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {def.setupTip && !flowId && (
          <p className="border-b border-indigo-100 bg-indigo-50 px-4 py-2.5 text-xs text-indigo-900 sm:px-5">{def.setupTip}</p>
        )}
        {saveError && (
          <p role="alert" className="flex items-start gap-2 border-b border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-700 sm:px-5"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{saveError}</p>
        )}

        <div className="relative h-[85vh] sm:h-[640px]">
          {!ready && !loadError && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-500" role="status"><Spinner className="h-5 w-5 text-indigo-600" />Loading viaSocket…</div>
          )}
          {loadError && (
            <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-900">Couldn't open the setup screen</p>
              <p className="text-sm text-slate-500">{loadError}</p>
            </div>
          )}
          <div ref={boxRef} className="relative z-10 h-full w-full" />
        </div>
      </div>
    </div>
  );
}
