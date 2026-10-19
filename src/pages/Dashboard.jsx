import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Check, Copy, Download, RefreshCw, Search, Users, GraduationCap, Building2, Mail, ArrowRight, Inbox } from "lucide-react";
import { Badge, Button, Card, inputClass } from "../components/ui.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const FILTERS = [["ALL", "All"], ["IET_DAVV", "IET / DAVV"], ["OTHER", "Other"]];

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{value.toLocaleString("en-IN")}</p>
    </Card>
  );
}

function ShareCard() {
  const url = `${window.location.origin}/`;
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setFailed(false); setTimeout(() => setCopied(false), 2000); }
    catch { setFailed(true); }
  }
  return (
    <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="mx-auto shrink-0 rounded-xl bg-white p-3 ring-1 ring-slate-200 sm:mx-0">
        <QRCodeSVG value={url} size={136} level="M" role="img" aria-label="QR code for the registration link" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-slate-900">Share registration link</h2>
        <p className="mt-1 text-sm text-slate-500">Show this QR code at the venue, or send the link. Candidates need no account.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input readOnly value={url} aria-label="Registration link" onFocus={(e) => e.target.select()} className={`${inputClass(false)} sm:flex-1`} />
          <Button variant="secondary" onClick={copy} className="sm:w-32">
            {copied ? <><Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />Copied</> : <><Copy className="h-4 w-4" aria-hidden="true" />Copy link</>}
          </Button>
        </div>
        <p role="status" aria-live="polite" className={failed ? "mt-2 text-xs text-amber-700" : "sr-only"}>{failed ? "Couldn't copy automatically. Select the link and copy it." : copied ? "Link copied" : ""}</p>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { summary, error, refresh } = useOutletContext();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { document.title = "Dashboard · HireDrive"; }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (summary?.registrations ?? []).filter((r) =>
      (filter === "ALL" || r.college_group === filter) &&
      (!q || [r.name, r.email, r.phone, r.college].some((v) => v.toLowerCase().includes(q)))
    );
  }, [summary, query, filter]);

  async function doRefresh() { setRefreshing(true); await refresh(); setRefreshing(false); }

  if (!summary) {
    return (
      <Card className="p-8 text-center" role="alert">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" aria-hidden="true" />
        <p className="mt-3 font-medium text-slate-900">Couldn't load the dashboard</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <Button className="mt-5" onClick={doRefresh} loading={refreshing}>Try again</Button>
      </Card>
    );
  }

  const { counts, slots, registrations } = summary;
  const notReady = slots.filter((s) => s.state !== "active").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Every registration, newest first. Updates every few seconds.</p>
        </div>
        <Button variant="secondary" onClick={doRefresh} loading={refreshing}><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh</Button>
      </div>

      {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-600/20">Couldn't refresh: {error}. Showing the last data we have.</div>}

      {notReady > 0 && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-600/20 sm:flex-row sm:items-center">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="flex-1 text-sm text-amber-900">Registrations are saved but not sent to Sheets/Gmail until all 4 integrations are set up. <strong>{4 - notReady} of 4 are active.</strong></p>
          <Link to="/admin/integrations" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700">Set up integrations <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} label="Total" value={counts.total} tone="bg-indigo-50 text-indigo-600" />
        <Stat icon={GraduationCap} label="IET / DAVV" value={counts.iet_davv} tone="bg-sky-50 text-sky-600" />
        <Stat icon={Building2} label="Other colleges" value={counts.other} tone="bg-violet-50 text-violet-600" />
        <Stat icon={Mail} label="Welcome emails sent" value={counts.emails_sent} tone="bg-emerald-50 text-emerald-600" />
      </div>

      <ShareCard />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone, college" aria-label="Search registrations" className={`${inputClass(false)} pl-10`} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Filter by college group" className="inline-flex rounded-xl bg-slate-100 p-1">
              {FILTERS.map(([key, label]) => (
                <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}
                  className={`min-h-9 rounded-lg px-3 text-sm font-medium ${filter === key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{label}</button>
              ))}
            </div>
            <a href="/api/admin/registrations.csv" download className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
              <Download className="h-4 w-4" aria-hidden="true" />Export CSV
            </a>
          </div>
        </div>

        {registrations.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Inbox className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="mt-3 font-medium text-slate-900">No registrations yet</p>
            <p className="mt-1 text-sm text-slate-500">Share the link or QR code above. New candidates appear here.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Search className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="mt-3 font-medium text-slate-900">No one matches</p>
            <p className="mt-1 text-sm text-slate-500">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">Registrations, newest first</caption>
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>{["Name", "Email", "Phone", "College", "Sheet", "Sheet status", "Email status", "Time"].map((h) => <th key={h} scope="col" className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{r.name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">+{r.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{r.college}</td>
                    <td className="whitespace-nowrap px-4 py-3"><Badge tone={r.college_group === "IET_DAVV" ? "indigo" : "slate"}>{r.college_group === "IET_DAVV" ? "IET / DAVV" : "Other"}</Badge></td>
                    <td className="px-4 py-3"><StatusBadge status={r.sheet_status} error={r.sheet_error} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.email_status} error={r.email_error} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(r.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {registrations.length > 0 && (
          <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
            Showing {rows.length.toLocaleString("en-IN")} of the newest {registrations.length.toLocaleString("en-IN")}
            {counts.total > registrations.length && <> ({counts.total.toLocaleString("en-IN")} total; Export CSV has all of them)</>}.
          </p>
        )}
      </Card>
    </div>
  );
}
