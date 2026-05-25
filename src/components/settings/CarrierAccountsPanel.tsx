"use client";

import { CarrierAccountsTab } from "./CarrierAccountsTab";

export function CarrierAccountsPanel({
  canManageCarrierAccounts,
}: {
  canManageCarrierAccounts: boolean;
}) {
  return (
    <CarrierAccountsTab role={canManageCarrierAccounts ? "ADMIN" : "VIEWER"} />
  );
}
