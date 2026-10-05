import type { Metadata, Viewport } from "next";
import { StaffShell } from "@/components/staff/staff-shell";
import { fontVars } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Rotyi Staff", template: "%s · Rotyi Staff" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#221a16", width: "device-width", initialScale: 1 };

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body>
        <StaffShell>{children}</StaffShell>
      </body>
    </html>
  );
}
