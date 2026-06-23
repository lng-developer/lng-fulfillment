import { Metadata } from "next";
import { ShippingCostsPage } from "@/components/shipping-costs/ShippingCostsPage";

export const metadata: Metadata = {
  title: "Shipping Costs | Fulfillment Platform",
};

export default function Page() {
  return <ShippingCostsPage />;
}
