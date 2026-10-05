import type { Metadata } from "next";
import { KitchenBoard } from "@/components/staff/kitchen";

export const metadata: Metadata = { title: "Kitchen" };

export default function Page() {
  return <KitchenBoard />;
}
