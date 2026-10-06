"use client";

import { supabase } from "./supabase/browser";

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** iPhone/iPad only allow web push once the app is added to the Home Screen. */
export const needsHomeScreen = () =>
  typeof window !== "undefined" &&
  /iPhone|iPad|iPod/.test(navigator.userAgent) &&
  !(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone);

export async function registerStaffWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

/** Ask permission, subscribe this device and store it for the signed-in staff member. */
export async function enablePush(userId: string): Promise<"on" | "denied" | "unsupported" | "home-screen" | "error"> {
  if (needsHomeScreen()) return "home-screen";
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!pushSupported() || !key) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  try {
    const reg = (await registerStaffWorker()) ?? (await navigator.serviceWorker.ready);
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const sb = supabase();
    await sb.from("push_subscriptions").delete().eq("endpoint", json.endpoint);
    const { error } = await sb.from("push_subscriptions").insert({
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    });
    return error ? "error" : "on";
  } catch {
    return "error";
  }
}
