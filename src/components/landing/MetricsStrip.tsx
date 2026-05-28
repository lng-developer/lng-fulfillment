const metrics = [
  { value: "10K", unit: "+", label: "Đơn xử lý / tháng" },
  { value: "99.9", unit: "%", label: "Uptime SLA" },
  { value: "<2", unit: "s", label: "API response time" },
  { value: "4", unit: " roles", label: "RBAC granular" },
];

export function MetricsStrip() {
  return (
    <section className="grid border-b border-[var(--border)] bg-[var(--bg-surface)] sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          className="border-b border-r border-[var(--border)] px-6 py-6 text-center last:border-r-0 sm:[&:nth-child(2n)]:border-r-0 lg:border-b-0 lg:[&:nth-child(2n)]:border-r lg:[&:last-child]:border-r-0"
          key={metric.label}
        >
          <div className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            {metric.value}
            <span className="text-[13px] font-medium text-[var(--brand)]">
              {metric.unit}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            {metric.label}
          </div>
        </div>
      ))}
    </section>
  );
}
