import { Globe, ShoppingBag, ShoppingCart, Truck } from "lucide-react";

const testimonials = [
  {
    name: "Nguyen Van Minh",
    role: "Fulfillment Manager",
    initials: "NV",
    color: "var(--brand)",
    quote:
      '"Preflight check giúp tôi tự tin hơn khi execute — biết chắc mọi thứ đúng trước khi gửi lên carrier."',
  },
  {
    name: "Tran Thi Lan",
    role: "Operations Lead",
    initials: "TT",
    color: "#059669",
    quote:
      '"Expandable rows thay đổi hoàn toàn cách làm việc. Không còn phải click qua lại nhiều màn hình."',
  },
  {
    name: "Pham Hong Duc",
    role: "Tech Lead",
    initials: "PH",
    color: "#d97706",
    quote:
      '"Audit logs chi tiết với auto-redact giúp chúng tôi compliance mà không lo lộ thông tin nhạy cảm."',
  },
];

const platforms = [
  { name: "Portal API", Icon: Globe },
  { name: "Orders", Icon: ShoppingCart },
  { name: "Shipments", Icon: Truck },
  { name: "Marketplaces", Icon: ShoppingBag },
];

export function Testimonials() {
  return (
    <section
      className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-12 md:px-7"
      id="security"
    >
      <div className="mx-auto max-w-[980px]">
        <div className="grid gap-2.5 md:grid-cols-3">
          {testimonials.map((item) => (
            <div
              className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface2)] p-5 transition-all hover:border-[var(--brand-mid)] hover:bg-[var(--brand-light)]"
              key={item.name}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: item.color }}
                >
                  {item.initials}
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[var(--text-primary)]">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {item.role}
                  </div>
                </div>
              </div>
              <p className="text-[12px] italic leading-relaxed text-[var(--text-secondary)]">
                {item.quote}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-7 border-t border-[var(--border)] pt-6">
          {platforms.map((platform) => {
            const Icon = platform.Icon;
            return (
              <span
                className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-muted)] opacity-70"
                key={platform.name}
              >
                <Icon size={14} /> {platform.name}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
