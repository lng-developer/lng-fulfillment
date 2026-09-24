"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/rbac";
import { ShipmentDetailPanel } from "./ShipmentDetailPanel";
import { ShipmentsTable } from "./ShipmentsTable";

export function ShipmentsPageContent({ role: roleProp }: { role?: Role }) {
  const { membership } = useAuth();
  const role = roleProp ?? membership?.role ?? "VIEWER";
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null,
  );
  const [listReloadKey, setListReloadKey] = useState(0);

  return (
    <>
      <ShipmentsTable
        onShipmentSelect={setSelectedShipmentId}
        reloadKey={listReloadKey}
        role={role}
      />
      <ShipmentDetailPanel
        onChanged={() => setListReloadKey((value) => value + 1)}
        onClose={() => setSelectedShipmentId(null)}
        role={role}
        shipmentId={selectedShipmentId}
      />
    </>
  );
}
