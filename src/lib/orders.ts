// Dine-in order lifecycle, shared by guest, kitchen and admin screens.
export const ORDER_FLOW = ["placed", "accepted", "preparing", "ready", "served", "paid"] as const;
export type OrderStatus = (typeof ORDER_FLOW)[number] | "cancelled";

export const statusLabel: Record<"hu" | "en", Record<OrderStatus, string>> = {
  hu: { placed: "Leadva", accepted: "Elfogadva", preparing: "Készül", ready: "Kész, visszük!", served: "Felszolgálva", paid: "Fizetve", cancelled: "Törölve" },
  en: { placed: "Placed", accepted: "Accepted", preparing: "Cooking", ready: "Ready, on its way!", served: "Served", paid: "Paid", cancelled: "Cancelled" },
};

/** Which statuses each role may move an order to. */
export const allowedTargets: Record<"admin" | "kitchen", OrderStatus[]> = {
  kitchen: ["accepted", "preparing", "ready"],
  admin: ["accepted", "preparing", "ready", "served", "paid", "cancelled"],
};

export function canMove(from: OrderStatus, to: OrderStatus, role: "admin" | "kitchen") {
  if (!allowedTargets[role].includes(to) || from === to) return false;
  if (from === "paid" || from === "cancelled") return false;
  if (to === "cancelled") return from !== "served" || role === "admin";
  return true; // staff may skip ahead or step back one stage to fix mistakes
}

export const MAX_LINES = 30;
export const MAX_QTY = 20;
