import type { Metadata } from "next";
import { AdminStaff } from "@/components/staff/staff";

export const metadata: Metadata = { title: "Staff" };

export default function Page() {
  return <AdminStaff />;
}
