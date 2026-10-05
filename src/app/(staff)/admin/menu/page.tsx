import type { Metadata } from "next";
import { AdminMenu } from "@/components/staff/menu";

export const metadata: Metadata = { title: "Menu" };

export default function Page() {
  return <AdminMenu />;
}
