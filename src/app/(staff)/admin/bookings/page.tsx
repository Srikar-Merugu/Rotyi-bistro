import type { Metadata } from "next";
import { AdminBookings } from "@/components/staff/bookings";

export const metadata: Metadata = { title: "Bookings" };

export default function Page() {
  return <AdminBookings />;
}
