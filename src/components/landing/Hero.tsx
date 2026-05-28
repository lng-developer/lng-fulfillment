import {
  LayoutDashboard,
  Package,
  Play,
  Settings,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";

const navItems = [
  { icon: Package, label: "Orders", active: true },
  { icon: Truck, label: "Shipments", active: false },
];

const stats = [
  { n: "143", l: "Total", c: "var(--text-primary)" },
  { n: "12", l: "Ready", c: "var(--success)" },
  { n: "24", l: "Transit", c: "#2563eb" },
  { n: "2", l: "Exception", c: "#dc2626" },
];

const rows = [
  { n: "ORDER-2847", s: "READY_TO_SHIP", r: "Nguyen Van A", i: "2 items" },
  {
    n: "ORDER-2846",
    s: "READY_TO_SHIP",
    r: "Tran Thi B",
    i: "1 item",
    hi: true,
  },
  { n: "ORDER-2844", s: "IN_TRANSIT", r: "Li Wei", i: "1 item" },
  { n: "ORDER-2843", s: "PENDING", r: "Park Ji-ho", i: "2 items" },
];

export function Hero() {
  return (
    <section className="overflow-hidden bg-[var(--ink2)] px-4 pt-16 md:px-7">
      <div className="mx-auto max-w-[980px] text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(165,180,252,0.25)] bg-[rgba(99,102,241,0.15)] px-3 py-1.5 text-[11px] font-medium text-[#a5b4fc]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#a5b4fc]" />
          Fulfillment Platform v2 — Mới ra mắt
        </div>

        <h1 className="mx-auto mb-5 max-w-[680px] text-[38px] font-semibold leading-[1.1] tracking-[-0.03em] text-white md:text-[50px]">
          Vận hành <em className="not-italic text-[#a5b4fc]">fulfillment</em>
          <br />
          không còn phức tạp
        </h1>

        <p className="mx-auto mb-8 max-w-[500px] text-[16px] leading-[1.7] text-[rgba(255,255,255,0.55)]">
          Từ nhận đơn, tạo shipment đến tích hợp carrier — một nền tảng kiểm
          soát toàn bộ với bảo mật cấp enterprise.
        </p>

        <div className="mb-12 flex flex-wrap justify-center gap-3">
          <Link className="lp-btn-primary" href="/orders">
            <LayoutDashboard size={15} /> Vào dashboard
          </Link>
          <button className="lp-btn-ghost" type="button">
            <Play size={15} /> Xem demo · 2 phút
          </button>
        </div>

        <DashboardMockup />
      </div>
    </section>
  );
}

function DashboardMockup() {
  return (
    <div className="mx-auto max-w-[760px] overflow-hidden rounded-t-[10px] border border-b-0 border-[rgba(255,255,255,0.1)] bg-[var(--bg-surface2)]">
      <div className="flex h-9 items-center gap-2 border-b border-[rgba(255,255,255,0.06)] bg-[var(--ink)] px-4">
        <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
        <div className="h-2 w-2 rounded-full bg-[#f59e0b]" />
        <div className="h-2 w-2 rounded-full bg-[#10b981]" />
        <span className="ml-2 font-mono text-[11px] text-[rgba(255,255,255,0.3)]">
          Fulfillment Platform - Orders
        </span>
      </div>

      <div className="flex h-[220px]">
        <div className="w-[140px] flex-shrink-0 border-r border-[rgba(255,255,255,0.05)] bg-[#0f1124] p-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                className={`mb-0.5 flex items-center gap-2 rounded-[5px] px-2 py-1.5 text-[10px] ${
                  item.active
                    ? "bg-[rgba(99,102,241,0.2)] text-[#a5b4fc]"
                    : "text-[rgba(255,255,255,0.35)]"
                }`}
                key={item.label}
              >
                <Icon size={13} /> {item.label}
              </div>
            );
          })}
          <div className="mt-2 flex items-center gap-2 rounded-[5px] px-2 py-1.5 text-[10px] text-[rgba(255,255,255,0.35)]">
            <Settings size={13} /> Settings
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)]">
              Orders
            </span>
            <span className="text-[10px] font-medium text-[var(--brand)]">
              + Create
            </span>
          </div>

          <div className="mb-2 grid grid-cols-4 gap-1.5">
            {stats.map((stat) => (
              <div
                className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-1.5 text-left"
                key={stat.l}
              >
                <div className="text-[14px] font-semibold" style={{ color: stat.c }}>
                  {stat.n}
                </div>
                <div className="text-[9px] text-[var(--text-muted)]">{stat.l}</div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-surface)]">
            <div className="grid grid-cols-4 border-b border-[var(--border)] bg-[var(--bg-surface2)] px-2.5 py-1.5">
              {["Order #", "Status", "Recipient", "Items"].map((header) => (
                <span
                  className="text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                  key={header}
                >
                  {header}
                </span>
              ))}
            </div>
            {rows.map((row) => (
              <div
                className={`grid grid-cols-4 items-center border-b border-[var(--border)] px-2.5 py-1.5 last:border-b-0 ${
                  row.hi ? "bg-[var(--brand-light)]" : ""
                }`}
                key={row.n}
              >
                <span className="font-mono text-[10px] text-[var(--brand)]">
                  {row.n}
                </span>
                <span>
                  <StatusBadge className="px-1.5 py-0 text-[8px]" status={row.s} />
                </span>
                <span className="truncate text-left text-[10px] text-[var(--text-secondary)]">
                  {row.r}
                </span>
                <span className="text-left text-[10px] text-[var(--text-muted)]">
                  {row.i}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
