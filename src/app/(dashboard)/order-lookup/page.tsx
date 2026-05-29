import type { Metadata } from "next";
import OrderLookupPage from "@/components/order-lookup/OrderLookupPage";

export const metadata: Metadata = {
  title: "Yun Lookup | Fulfillment Platform",
  description:
    "Tra cứu trực tiếp OrderNumber, WayBillNumber hoặc TrackingNumber trên YunExpress OMS.",
};

export default function Page() {
  return <OrderLookupPage />;
}
