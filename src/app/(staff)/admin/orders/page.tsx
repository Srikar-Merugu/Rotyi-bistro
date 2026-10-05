import type { Metadata } from "next";
import { AdminOrders } from "@/components/staff/orders";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <AdminOrders />;
}
