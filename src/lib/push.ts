import "server-only";
import webpush from "web-push";
import { db } from "./supabase/server";

// Phone/desktop push for the staff PWA. Only alerts that need someone to act
// are pushed; everything else stays an in-app toast.
const PUSH: Record<string, "all" | "admin"> = {
  "order.new": "all",
  "order.ready": "admin",
  "booking.new": "admin",
  "service.waiter": "admin",
  "service.bill": "admin",
  "feedback.low": "admin",
};

const urlFor = (kind: string) =>
  kind.startsWith("booking.") ? "/admin/bookings" : kind === "order.new" ? "/kitchen" : kind.startsWith("feedback.") ? "/admin/feedback" : "/admin/orders";

let configured: boolean | null = null;
function ready() {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(pub && priv);
  if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@example.com", pub!, priv!);
  return configured;
}

export async function pushAlert(kind: string, title: string, body: string) {
  const audience = PUSH[kind];
  if (!audience || !ready()) return;
  let staffQuery = db().from("staff").select("user_id");
  if (audience === "admin") staffQuery = staffQuery.eq("role", "admin");
  const { data: staff } = await staffQuery;
  const ids = (staff ?? []).map((s) => s.user_id);
  if (!ids.length) return;
  const { data: subs } = await db().from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", ids);
  const payload = JSON.stringify({ title, body, url: urlFor(kind), tag: kind });
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 600, urgency: "high" });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db().from("push_subscriptions").delete().eq("id", s.id); // device gone
        else console.error("[push] failed", code);
      }
    }),
  );
}
