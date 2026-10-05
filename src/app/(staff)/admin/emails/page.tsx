import type { Metadata } from "next";
import { AdminEmails } from "@/components/staff/emails";

export const metadata: Metadata = { title: "Emails" };

export default function Page() {
  return <AdminEmails />;
}
