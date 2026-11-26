"use client";
import { CopyButton } from '@/components/ui/CopyButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { ShipmentListItem } from '@/types/shipments';

export function ShipmentStatus({ shipment }: { shipment: ShipmentListItem }) {
  return <StatusBadge status={shipment.status} label={shipment.carrierCode === 'VIETTEL_POST' && shipment.status === 'TRACKING_PENDING' && shipment.trackingNumber ? 'Chờ vận chuyển' : undefined} />;
}
export function ShipmentHistory({ shipments, onSelect }: { shipments: ShipmentListItem[]; onSelect: (id: string) => void }) {
  return <div className="space-y-2 p-4">
    <p className="text-xs font-semibold text-slate-700">Lịch sử vận đơn — mới nhất trước</p>
    <ul className="space-y-2">
      {shipments.map(shipment => <li key={shipment.id} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 text-xs">
        <span className="font-mono font-semibold">{shipment.carrierShipmentId ?? 'Chưa có mã vận đơn'}</span>
        <ShipmentStatus shipment={shipment} />
        {shipment.trackingNumber && <span className="inline-flex items-center gap-1 font-mono">{shipment.trackingNumber}<CopyButton value={shipment.trackingNumber} label="Sao chép tracking cũ" /></span>}
        <span className="text-slate-500">Tạo: {new Date(shipment.createdAt).toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'})}</span>
        <button type="button" className="rounded px-2 py-1 font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500" onClick={() => onSelect(shipment.id)}>Xem chi tiết</button>
      </li>)}
    </ul>
  </div>;
}
