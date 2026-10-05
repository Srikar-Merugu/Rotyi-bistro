import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderTracker } from "@/components/order-tracker";
import { isLocale } from "@/lib/routes";

export const metadata: Metadata = { title: "Rotyi · Rendelés / Your order", robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: PageProps<"/[lang]/t/[token]/order/[id]">) {
  const { lang, token, id } = await params;
  const { k } = await searchParams;
  if (!isLocale(lang) || typeof k !== "string") notFound();
  return <OrderTracker lang={lang} token={token} id={id} guestKey={k} />;
}
