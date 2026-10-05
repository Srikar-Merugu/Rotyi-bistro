"use client";

import { useState } from "react";
import { staffFetch, supabase } from "@/lib/supabase/browser";
import { useStaff } from "./staff-shell";
import { Badge, Btn, Card, Empty, PageTitle, q, useLive } from "./ui";

type Member = { user_id: string; email: string; name: string | null; role: string; created_at: string };
type Invite = { email: string; role: string; name: string | null; used_at: string | null };

export function AdminStaff() {
  const { staff: me } = useStaff();
  const [msg, setMsg] = useState<string | null>(null);
  const { data, reload } = useLive(async () => {
    const [members, invites] = await Promise.all([
      q<Member[]>(supabase().from("staff").select("*").order("created_at")),
      q<Invite[]>(supabase().from("staff_invites").select("*").is("used_at", null)),
    ]);
    return { members, invites };
  }, ["staff"]);

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const r = await staffFetch("/api/staff/invite", { email: f.get("email"), role: f.get("role"), name: f.get("name") });
      setMsg(r.invited ? "Invite email sent. They set their own password from the link." : "Existing account linked with the new role.");
      form.reset();
      reload();
    } catch (err) {
      setMsg(`Failed: ${(err as Error).message}`);
    }
  }

  return (
    <>
      <PageTitle title="Staff" />
      <Card className="mb-6">
        <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
          <label className="block flex-1"><span className="mb-1 block text-sm font-semibold">Email</span><input name="email" type="email" required className="min-h-11 w-full rounded-xl border-2 border-ink/20 bg-white px-3" /></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Name</span><input name="name" className="min-h-11 rounded-xl border-2 border-ink/20 bg-white px-3" /></label>
          <label className="block"><span className="mb-1 block text-sm font-semibold">Role</span>
            <select name="role" className="min-h-11 rounded-xl border-2 border-ink/20 bg-white px-2"><option value="kitchen">Kitchen</option><option value="admin">Admin</option></select>
          </label>
          <Btn type="submit" tone="red">Invite</Btn>
        </form>
        {msg && <p className="mt-2 text-sm font-semibold" role="status">{msg}</p>}
      </Card>
      {!data ? <Empty>Loading…</Empty> : (
        <div className="space-y-2">
          {data.members.map((m) => (
            <Card key={m.user_id} className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-bold">{m.name ?? m.email}</p><p className="text-sm text-ink/70">{m.email}</p></div>
              <div className="flex items-center gap-2">
                <Badge value={m.role === "admin" ? "confirmed" : "accepted"} label={m.role} />
                {m.user_id !== me.user_id && (
                  <Btn tone="ghost" onClick={async () => { if (confirm(`Remove ${m.email} from staff?`)) { await supabase().from("staff").delete().eq("user_id", m.user_id); await supabase().from("staff_invites").delete().eq("email", m.email); reload(); } }}>Remove</Btn>
                )}
              </div>
            </Card>
          ))}
          {data.invites.map((i) => (
            <Card key={i.email} className="flex items-center justify-between gap-2 opacity-70">
              <p>{i.email} <span className="text-sm">(invited as {i.role}, not signed up yet)</span></p>
              <Btn tone="ghost" onClick={async () => { await supabase().from("staff_invites").delete().eq("email", i.email); reload(); }}>Revoke</Btn>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
