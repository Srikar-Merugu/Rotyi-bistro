"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { ago, Badge, Card, Empty, PageTitle, q, useLive, useTick } from "./ui";

type Mail = { id: string; to_email: string; subject: string; html: string; kind: string; status: string; error: string | null; created_at: string };

export function AdminEmails() {
  useTick();
  const [open, setOpen] = useState<Mail | null>(null);
  const { data } = useLive(() => q<Mail[]>(supabase().from("email_outbox").select("*").order("created_at", { ascending: false }).limit(100)), ["email_outbox"]);
  return (
    <>
      <PageTitle title="Emails" />
      <p className="mb-4 max-w-2xl text-ink/80">Every email the system sends (or would send) is logged here. “Skipped” means the Resend key isn&apos;t configured yet.</p>
      {!data ? <Empty>Loading…</Empty> : data.length === 0 ? <Empty>No emails yet.</Empty> : (
        <div className="space-y-2">
          {data.map((m) => (
            <button key={m.id} type="button" onClick={() => setOpen(m)} className="block w-full text-left">
              <Card className="flex flex-wrap items-center justify-between gap-2 transition hover:-translate-y-0.5">
                <div className="min-w-0">
                  <p className="truncate font-bold">{m.subject}</p>
                  <p className="text-sm text-ink/70">→ {m.to_email} · {m.kind} · {ago(m.created_at)}</p>
                  {m.error && <p className="text-xs text-paprika-ink">{m.error}</p>}
                </div>
                <Badge value={m.status} />
              </Card>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/50 sm:items-center sm:justify-center" onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label={open.subject}>
          <div className="h-[85vh] w-full overflow-hidden rounded-t-3xl bg-white sm:max-w-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-3">
              <p className="truncate font-bold">{open.subject}</p>
              <button type="button" onClick={() => setOpen(null)} className="grid h-10 w-10 place-items-center rounded-full bg-ink text-cream" aria-label="Close">✕</button>
            </div>
            <iframe title="Email preview" srcDoc={open.html} sandbox="" className="h-full w-full" />
          </div>
        </div>
      )}
    </>
  );
}
