import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, AlertCircle } from "lucide-react";
import { api } from "../lib/api.js";
import { Button, Card, inputClass } from "../components/ui.jsx";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { document.title = "HR sign in · HireDrive"; }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!password) { setError("Enter the admin password"); return; }
    setBusy(true); setError("");
    try {
      await api("/api/admin/login", { method: "POST", body: { password } });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.status === 503 ? "Admin sign-in isn't set up on the server yet." : err.message);
    } finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Lock className="h-6 w-6" aria-hidden="true" /></span>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">HR sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the admin password to see registrations.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-800">Password</label>
            <div className="relative">
              <input id="password" type={show ? "text" : "password"} autoComplete="current-password" autoFocus value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                aria-invalid={!!error} aria-describedby="login-error" className={`${inputClass(!!error)} pr-12`} />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-800">
                {show ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <p id="login-error" role="alert" aria-live="polite" className={error ? "flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-600/20" : "sr-only"}>
            {error && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}{error}
          </p>
          <Button type="submit" loading={busy} className="w-full">Sign in</Button>
        </form>
      </Card>
    </main>
  );
}
