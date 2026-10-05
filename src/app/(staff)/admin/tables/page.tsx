import type { Metadata } from "next";
import { AdminTables } from "@/components/staff/tables";

export const metadata: Metadata = { title: "Tables & QR" };

export default function Page() {
  return <AdminTables />;
}
