import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Plug, LogOut, ClipboardList } from "lucide-react";
import { api } from "../lib/api.js";
import { Spinner } from "../components/ui.jsx";

const POLL_MS = 15_000;

// Guards every /admin page: the summary call doubles as the session check, and keeps the numbers fresh.
export default function AdminLayout() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setSummary(await api("/api/admin/summary"));
      setError("");
    } catch (err) {
      if (err.status === 401) navigate("/admin/login", { replace: true });
      else setError(err.message);
    } finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => {
    refresh();
    const t = setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  async function logout() {
    try { await api("/api/admin/logout", { method: "POST" }); } catch { /* cookie expires anyway */ }
    navigate("/admin/login", { replace: true });
  }

  if (loading && !summary) {
    return <div className="flex min-h-dvh items-center justify-center text-slate-500" role="status"><Spinner className="h-6 w-6 text-indigo-600" /><span className="sr-only">Loading</span></div>;
  }

  const link = ({ isActive }) =>
    `inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
          <span className="mr-2 inline-flex items-center gap-2 text-base font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white"><ClipboardList className="h-4 w-4" aria-hidden="true" /></span>
            <span className="hidden sm:inline">HireDrive</span>
          </span>
          <nav aria-label="Admin" className="flex flex-1 items-center gap-1">
            <NavLink to="/admin" end className={link}><LayoutDashboard className="h-4 w-4" aria-hidden="true" />Dashboard</NavLink>
            <NavLink to="/admin/integrations" className={link}><Plug className="h-4 w-4" aria-hidden="true" />Integrations</NavLink>
          </nav>
          <button onClick={logout} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100">
            <LogOut className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Logout</span><span className="sr-only sm:hidden">Logout</span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet context={{ summary, error, refresh }} />
      </main>
    </div>
  );
}
