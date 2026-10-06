import type { Metadata } from "next";
import { AdminFeedback } from "@/components/staff/feedback";

export const metadata: Metadata = { title: "Feedback" };

export default function Page() {
  return <AdminFeedback />;
}
