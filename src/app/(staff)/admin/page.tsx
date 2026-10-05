import type { Metadata } from "next";
import { AdminOverview } from "@/components/staff/overview";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return <AdminOverview />;
}
