import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, MapPin, CheckCircle2, MailCheck, Zap, Users, AlertCircle } from "lucide-react";
import { COMPANY_NAME, DRIVE_NAME, DRIVE_DATE, VENUE } from "../config.js";
import { validateRegistration } from "../../server/rules.js";
import { api } from "../lib/api.js";
import { Button, Card, Field, inputClass } from "../components/ui.jsx";

const EMPTY = { name: "", email: "", phone: "", college: "", college_other: "" };
const EXPECT = [
  { icon: Zap, text: "Register in under a minute. No account needed." },
  { icon: MailCheck, text: "A welcome email lands in your inbox right after." },
  { icon: Users, text: "Show up on the day and meet the team." },
];

export default function Register() {
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const formRef = useRef(null);

  useEffect(() => { document.title = `${DRIVE_NAME} · Register`; }, []);

  const result = useMemo(() => validateRegistration(form), [form]);
  const errors = { ...(result.ok ? {} : result.errors), ...serverErrors };
  const shown = (k) => ((touched[k] || submitted) ? errors[k] : undefined);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setServerErrors((s) => (s[k] ? { ...s, [k]: undefined } : s));
    setFormError("");
  };
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));
  const describe = (k, hint) => [hint && !shown(k) ? `${k}-hint` : null, `${k}-error`].filter(Boolean).join(" ");

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setFormError("");
    if (!result.ok) {
      const first = Object.keys(result.errors)[0];
      formRef.current?.querySelector(`#${first}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const r = await api("/api/register", { method: "POST", body: form });
      setDone({ name: r.name });
    } catch (err) {
      if (err.status === 409) setServerErrors({ email: "This email is already registered." });
      else if (err.status === 400 && err.data?.errors) setServerErrors(err.data.errors);
      else setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function again() {
    setForm(EMPTY); setTouched({}); setSubmitted(false); setServerErrors({}); setFormError(""); setDone(null);
    window.scrollTo({ top: 0 });
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-14">
      <section aria-labelledby="hero-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">{COMPANY_NAME}</p>
        <h1 id="hero-title" className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">{DRIVE_NAME}</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"><CalendarDays className="h-4 w-4 text-indigo-600" aria-hidden="true" />{DRIVE_DATE}</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"><MapPin className="h-4 w-4 text-indigo-600" aria-hidden="true" />{VENUE}</span>
        </div>
        <ul className="mt-7 hidden space-y-4 sm:block">
          {EXPECT.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="pt-1.5 text-slate-600">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <Card className="p-5 sm:p-8">
        {done ? (
          <div className="py-6 text-center" role="status">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" aria-hidden="true" /></span>
            <h2 className="mt-5 text-2xl font-bold text-slate-900">You're registered, {done.name.split(" ")[0]}!</h2>
            <p className="mt-2 text-slate-600">Check your inbox for a welcome email.</p>
            <Button variant="secondary" className="mt-8 w-full sm:w-auto" onClick={again}>Register another candidate</Button>
          </div>
        ) : (
          <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5" aria-label="Registration form">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Register now</h2>
              <p className="mt-1 text-sm text-slate-500">All fields are required.</p>
            </div>

            <Field id="name" label="Full name" error={shown("name")}>
              <input id="name" name="name" type="text" autoComplete="name" value={form.name} onChange={set("name")} onBlur={blur("name")} maxLength={100}
                aria-invalid={!!shown("name")} aria-describedby={describe("name")} className={inputClass(shown("name"))} placeholder="Asha Verma" />
            </Field>

            <Field id="email" label="Email" error={shown("email")}>
              <input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={form.email} onChange={set("email")} onBlur={blur("email")} maxLength={254}
                aria-invalid={!!shown("email")} aria-describedby={describe("email")} className={inputClass(shown("email"))} placeholder="you@example.com" />
            </Field>

            <Field id="phone" label="Mobile number" hint="10-digit number, we add 91 for you" error={shown("phone")}>
              <input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" value={form.phone} onChange={set("phone")} onBlur={blur("phone")} maxLength={20}
                aria-invalid={!!shown("phone")} aria-describedby={describe("phone", true)} className={inputClass(shown("phone"))} placeholder="98765 43210" />
            </Field>

            <Field id="college" label="College" error={shown("college")}>
              <select id="college" name="college" value={form.college} onChange={set("college")} onBlur={blur("college")}
                aria-invalid={!!shown("college")} aria-describedby={describe("college")} className={inputClass(shown("college"))}>
                <option value="" disabled>Select your college</option>
                <option value="IET">IET</option>
                <option value="DAVV">DAVV</option>
                <option value="Other">Other</option>
              </select>
            </Field>

            {form.college === "Other" && (
              <Field id="college_other" label="College name" error={shown("college_other")}>
                <input id="college_other" name="college_other" type="text" autoComplete="organization" value={form.college_other} onChange={set("college_other")} onBlur={blur("college_other")} maxLength={120}
                  aria-invalid={!!shown("college_other")} aria-describedby={describe("college_other")} className={inputClass(shown("college_other"))} placeholder="Name of your college" />
              </Field>
            )}

            {formError && (
              <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-600/20">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{formError}
              </div>
            )}

            <Button type="submit" loading={submitting} className="w-full">{submitting ? "Registering…" : "Register"}</Button>
          </form>
        )}
      </Card>

      <ul className="space-y-3 sm:hidden" aria-label="What to expect">
        {EXPECT.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm text-slate-600"><Icon className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />{text}</li>
        ))}
      </ul>
    </main>
  );
}
