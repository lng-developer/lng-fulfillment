import type { Metadata } from "next";
import OrderLookupPage from "@/components/order-lookup/OrderLookupPage";

export const metadata: Metadata = {
  title: "Orders Lookup | Fulfillment Platform",
  description:
    "Tra cứu trực tiếp OrderNumber, WayBillNumber hoặc TrackingNumber.",
};

export default function Page() {
  return <OrderLookupPage />;
}
