import type { Metadata } from "next";
import { AdminReports } from "@/components/staff/reports";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return <AdminReports />;
}
