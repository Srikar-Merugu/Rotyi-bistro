// Rotyi staff app service worker: shows push alerts and opens the right
// screen when one is tapped. No caching: staff screens must always be live.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Rotyi", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Rotyi", {
      body: data.body || "",
      icon: "/staff-icon-192.png",
      badge: "/staff-icon-192.png",
      tag: data.tag,
      renotify: true,
      requireInteraction: data.tag === "order.new",
      vibrate: [200, 100, 200],
      data: { url: data.url || "/admin" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const same = wins.find((w) => w.url.startsWith(self.location.origin + "/admin") || w.url.startsWith(self.location.origin + "/kitchen"));
      if (same) return same.focus().then((w) => w.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
