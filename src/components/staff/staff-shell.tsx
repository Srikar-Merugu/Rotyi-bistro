"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/browser";
import { KettleMascot } from "../art";
import { TableCalls } from "./table-calls";
import { enablePush, registerStaffWorker } from "@/lib/push-client";

export type Staff = { user_id: string; email: string; name: string | null; role: "admin" | "kitchen" };
export type Alert = { id: string; kind: string; title: string; body: string | null; created_at: string; read_at: string | null; ref_type: string | null; ref_id: string | null; audience: string };

type Ctx = { staff: Staff; alerts: Alert[]; unread: number; markAllRead: () => void };
const StaffContext = createContext<Ctx | null>(null);
export const useStaff = () => {
  const c = useContext(StaffContext);
  if (!c) throw new Error("useStaff outside StaffShell");
  return c;
};

const nav = [
  { href: "/admin", label: "Overview", icon: "◎", roles: ["admin"] },
  { href: "/admin/bookings", label: "Bookings", icon: "📅", roles: ["admin"] },
  { href: "/admin/orders", label: "Orders", icon: "🧾", roles: ["admin"] },
  { href: "/admin/reports", label: "Reports", icon: "📈", roles: ["admin"] },
  { href: "/kitchen", label: "Kitchen", icon: "🍲", roles: ["admin", "kitchen"] },
  { href: "/admin/tables", label: "Tables & QR", icon: "▦", roles: ["admin"] },
  { href: "/admin/menu", label: "Menu", icon: "📋", roles: ["admin"] },
  { href: "/admin/feedback", label: "Feedback", icon: "★", roles: ["admin"] },
  { href: "/admin/staff", label: "Staff", icon: "👥", roles: ["admin"] },
  { href: "/admin/emails", label: "Emails", icon: "✉", roles: ["admin"] },
] as const;

/** Short two-tone chime via Web Audio: no audio files to load. */
function chime(urgent = false) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = urgent ? [880, 1175, 880, 1175] : [880, 1320];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.16);
    });
  } catch {}
}

export function StaffShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // Staff row for the signed-in user, keyed by user id so a sign-out/sign-in can't show a stale role.
  const [lookup, setLookup] = useState<{ userId: string; staff: Staff | null } | null>(null);

  // Invite and password-reset links arrive with #...type=invite|recovery; those
  // users have no password yet, so they must set one before using the app.
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    const fromLink = /type=(invite|recovery)/.test(window.location.hash);
    const sb = supabase();
    // Realtime must carry the user's token before any channel subscribes,
    // otherwise RLS treats the socket as anonymous and sends no changes.
    const apply = async (s: Session | null) => {
      if (s) await sb.realtime.setAuth(s.access_token);
      setSession(s);
    };
    sb.auth.getSession().then(({ data }) => {
      if (fromLink && data.session) setNeedsPassword(true);
      apply(data.session);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY" || (fromLink && event === "SIGNED_IN")) setNeedsPassword(true);
      apply(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;
    supabase()
      .from("staff")
      .select("user_id, email, name, role")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setLookup({ userId, staff: (data as Staff) ?? null }));
  }, [session]);

  const staff = session && lookup?.userId === session.user.id ? lookup.staff : undefined;
  if (session === undefined || (session && staff === undefined)) return <Splash />;
  if (!session) return <Login />;
  if (needsPassword) return <SetPassword email={session.user.email ?? ""} onDone={() => setNeedsPassword(false)} />;
  if (!staff) return <NoAccess email={session.user.email ?? ""} />;
  return <Authed staff={staff}>{children}</Authed>;
}

function Authed({ staff, children }: { staff: Staff; children: React.ReactNode }) {
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [toasts, setToasts] = useState<Alert[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const soundRef = useRef(false);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const allowed = nav.filter((n) => (n.roles as readonly string[]).includes(staff.role));
  const canSee = allowed.some((n) => (n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)));

  useEffect(() => {
    const sb = supabase();
    sb.from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40)
      .then(({ data }) => setAlerts((data as Alert[]) ?? []));

    const channel = sb
      .channel("staff-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const a = payload.new as Alert;
        if (staff.role === "kitchen" && a.audience === "admin") return;
        setAlerts((prev) => [a, ...prev].slice(0, 60));
        setToasts((prev) => [a, ...prev].slice(0, 4));
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== a.id)), 7000);
        const urgent = a.kind === "order.new" || a.kind === "booking.new" || a.kind.startsWith("service.");
        if (soundRef.current) chime(urgent);
        navigator.vibrate?.(urgent ? [150, 80, 150] : 80);
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          new Notification(a.title, { body: a.body ?? undefined, tag: a.id, icon: "/icon.svg" });
        }
      })
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [staff.role]);

  const [pushMsg, setPushMsg] = useState<string | null>(null);
  useEffect(() => {
    registerStaffWorker();
  }, []);

  const enableAlerts = async () => {
    setSoundOn(true);
    chime();
    const r = await enablePush(staff.user_id);
    setPushMsg(
      {
        on: "Alerts on. This device now gets notifications even when the screen is locked.",
        denied: "Notifications are blocked for this site. Allow them in your browser settings to get alerts when the screen is off.",
        unsupported: "Sound alerts are on. This browser can't receive push notifications.",
        "home-screen": "On iPhone: tap Share → Add to Home Screen, open Rotyi Staff from there, then tap “Turn on alerts” again.",
        error: "Sound alerts are on, but push setup failed. Try again in a moment.",
      }[r],
    );
    setTimeout(() => setPushMsg(null), 9000);
  };

  const markAllRead = useCallback(async () => {
    const ids = alerts.filter((a) => !a.read_at).map((a) => a.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setAlerts((prev) => prev.map((a) => (a.read_at ? a : { ...a, read_at: now })));
    await supabase().from("notifications").update({ read_at: now }).in("id", ids);
  }, [alerts]);

  const unread = alerts.filter((a) => !a.read_at).length;

  return (
    <StaffContext.Provider value={{ staff, alerts, unread, markAllRead }}>
      <div className="min-h-screen bg-cream pb-24 lg:pb-0 lg:pl-60 print:p-0">
        {/* Sidebar (desktop) */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-ink p-4 text-cream lg:flex print:!hidden">
          <Link href={staff.role === "admin" ? "/admin" : "/kitchen"} className="mb-8 flex items-center gap-2">
            <KettleMascot className="h-10 w-10" steam={false} />
            <span className="font-[family-name:var(--font-sticker)] text-3xl text-paprika">ROTYI</span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1" aria-label="Staff">
            {allowed.map((n) => {
              const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold hover:bg-cream/10 aria-[current=page]:bg-paprika">
                  <span aria-hidden className="w-6 text-center">{n.icon}</span>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <UserBox staff={staff} />
        </aside>

        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b-2 border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur print:hidden">
          <Link href={staff.role === "admin" ? "/admin" : "/kitchen"} className="flex items-center gap-2 lg:hidden">
            <KettleMascot className="h-8 w-8" steam={false} />
            <span className="font-[family-name:var(--font-sticker)] text-2xl text-paprika-ink">ROTYI</span>
          </Link>
          <p className="hidden font-[family-name:var(--font-display)] text-xl uppercase lg:block">{allowed.find((n) => (n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)))?.label}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={soundOn ? () => setSoundOn(false) : enableAlerts}
              className={`min-h-11 rounded-full border-2 border-ink px-3 text-sm font-bold ${soundOn ? "bg-leaf text-white" : "bg-mustard"}`}
            >
              {soundOn ? "🔔 Alerts on" : "🔕 Turn on alerts"}
            </button>
            <AlertsBell />
            <div className="lg:hidden">
              <SignOut compact />
            </div>
          </div>
        </header>

        {pushMsg && (
          <p role="status" className="border-b-2 border-ink bg-mustard px-4 py-2 text-sm font-semibold print:hidden">
            {pushMsg}
          </p>
        )}
        {staff.role === "admin" && <TableCalls />}

        <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6">{canSee ? children : <NoAccess email={staff.email} role={staff.role} />}</main>

        {/* Bottom nav (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink/10 bg-cream-soft/95 backdrop-blur lg:hidden print:hidden" aria-label="Staff">
          <div className="hide-scrollbar flex overflow-x-auto px-1 pb-[env(safe-area-inset-bottom)]">
            {allowed.map((n) => {
              const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className="flex min-w-[72px] flex-1 flex-col items-center gap-0.5 px-2 py-2 text-xs font-bold aria-[current=page]:text-paprika-ink">
                  <span aria-hidden className="text-xl leading-none">{n.icon}</span>
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Live toasts */}
        <div className="pointer-events-none fixed right-3 top-16 z-50 flex w-[min(92vw,380px)] flex-col gap-2" aria-live="assertive">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto rounded-2xl border-2 border-ink bg-ink p-4 text-cream shadow-2xl [animation:pop-in_.5s_var(--ease-bounce)]">
              <p className="font-[family-name:var(--font-display)] text-lg uppercase text-mustard">{t.title}</p>
              {t.body && <p className="text-sm">{t.body}</p>}
            </div>
          ))}
        </div>
      </div>
    </StaffContext.Provider>
  );
}

function AlertsBell() {
  const { alerts, unread, markAllRead } = useStaff();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markAllRead();
        }}
        className="relative grid h-11 w-11 place-items-center rounded-full bg-ink text-cream"
        aria-label={`Alerts (${unread} unread)`}
        aria-expanded={open}
      >
        🔔
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-paprika px-1 text-xs font-bold">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-13 z-40 max-h-[70vh] w-[min(92vw,380px)] overflow-y-auto rounded-2xl border-2 border-ink bg-cream-soft p-2 shadow-2xl">
          {alerts.length === 0 && <p className="p-3 text-sm">No alerts yet.</p>}
          {alerts.map((a) => (
            <div key={a.id} className="rounded-xl p-3 odd:bg-cream/60">
              <p className="font-bold">{a.title}</p>
              {a.body && <p className="text-sm text-ink/75">{a.body}</p>}
              <p className="text-xs text-ink/50">{new Date(a.created_at).toLocaleString("hu-HU")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserBox({ staff }: { staff: Staff }) {
  return (
    <div className="rounded-xl bg-cream/10 p-3 text-sm">
      <p className="truncate font-semibold">{staff.name ?? staff.email}</p>
      <p className="mb-2 text-xs uppercase tracking-wider text-mustard">{staff.role}</p>
      <SignOut />
    </div>
  );
}

function SignOut({ compact }: { compact?: boolean }) {
  return (
    <button type="button" onClick={() => supabase().auth.signOut()} className={compact ? "min-h-11 rounded-full border-2 border-ink px-3 text-sm font-bold" : "underline underline-offset-4"}>
      Sign out
    </button>
  );
}

function SetPassword({ email, onDone }: { email: string; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== String(f.get("confirm"))) return setError("The two passwords don't match.");
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    window.history.replaceState(null, "", window.location.pathname);
    onDone();
  }
  return (
    <div className="grid min-h-screen place-items-center bg-paprika px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[2rem] border-2 border-ink bg-cream-soft p-6 shadow-[8px_8px_0_var(--color-ink)]">
        <div className="mb-4 flex items-center gap-3">
          <KettleMascot className="h-14 w-14" />
          <div>
            <p className="font-[family-name:var(--font-sticker)] text-3xl text-paprika-ink">ROTYI</p>
            <p className="text-sm font-bold uppercase tracking-wider">Welcome to the team</p>
          </div>
        </div>
        <p className="mb-4 text-base">Choose a password for <strong>{email}</strong>. You&apos;ll use it to sign in to the admin and kitchen screens.</p>
        <label className="mb-3 block">
          <span className="mb-1 block font-semibold">New password</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className="min-h-12 w-full rounded-xl border-2 border-ink/20 bg-white px-3 text-lg" />
        </label>
        <label className="mb-3 block">
          <span className="mb-1 block font-semibold">Repeat password</span>
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className="min-h-12 w-full rounded-xl border-2 border-ink/20 bg-white px-3 text-lg" />
        </label>
        {error && <p role="alert" className="mb-3 rounded-xl bg-paprika-ink px-3 py-2 text-sm font-semibold text-white">{error}</p>}
        <button type="submit" disabled={busy} className="pill pill-red w-full disabled:opacity-60">
          {busy ? "Saving…" : "Set password & continue"}
        </button>
      </form>
    </div>
  );
}

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream">
      <KettleMascot className="loader-pot w-24" />
    </div>
  );
}

function Login() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function forgot(form: HTMLFormElement | null) {
    const email = String(new FormData(form ?? undefined).get("email") ?? "").trim();
    if (!email) return setError("Type your email first, then tap “Forgot password?”.");
    setError(null);
    await fetch("/api/auth/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => {});
    setInfo("If that email is on the staff list, a reset link is on its way.");
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setBusy(false);
    if (error) setError(error.message);
  }
  return (
    <div className="grid min-h-screen place-items-center bg-paprika px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[2rem] border-2 border-ink bg-cream-soft p-6 shadow-[8px_8px_0_var(--color-ink)]">
        <div className="mb-4 flex items-center gap-3">
          <KettleMascot className="h-14 w-14" />
          <div>
            <p className="font-[family-name:var(--font-sticker)] text-3xl text-paprika-ink">ROTYI</p>
            <p className="text-sm font-bold uppercase tracking-wider">Staff sign in</p>
          </div>
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block font-semibold">Email</span>
          <input name="email" type="email" required autoComplete="username" className="min-h-12 w-full rounded-xl border-2 border-ink/20 bg-white px-3 text-lg" />
        </label>
        <label className="mb-3 block">
          <span className="mb-1 block font-semibold">Password</span>
          <input name="password" type="password" required autoComplete="current-password" className="min-h-12 w-full rounded-xl border-2 border-ink/20 bg-white px-3 text-lg" />
        </label>
        {error && <p role="alert" className="mb-3 rounded-xl bg-paprika-ink px-3 py-2 text-sm font-semibold text-white">{error}</p>}
        {info && <p role="status" className="mb-3 rounded-xl bg-leaf px-3 py-2 text-sm font-semibold text-white">{info}</p>}
        <button type="submit" disabled={busy} className="pill pill-red w-full disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <button type="button" onClick={(e) => forgot(e.currentTarget.form)} className="mt-3 w-full text-sm font-semibold underline underline-offset-4">
          Forgot password?
        </button>
      </form>
    </div>
  );
}

function NoAccess({ email, role }: { email: string; role?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <p className="display text-4xl">No access</p>
        <p className="mt-2">
          {email} {role ? `is ${role} staff and can't open this page.` : "isn't on the staff list. Ask an admin to invite this email."}
        </p>
        <div className="mt-4 flex justify-center gap-3">
          {role === "kitchen" && <Link href="/kitchen" className="pill pill-red">Go to kitchen</Link>}
          <SignOut compact />
        </div>
      </div>
    </div>
  );
}
