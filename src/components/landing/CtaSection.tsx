import { BookOpen, LogIn, Rocket } from "lucide-react";
import Link from "next/link";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--ink2)] px-4 py-20 text-center md:px-7">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[200px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[rgba(99,102,241,0.12)]" />

      <div className="relative z-10 mx-auto max-w-[500px]">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(165,180,252,0.25)] bg-[rgba(99,102,241,0.15)] px-3 py-1.5 text-[11px] font-medium text-[#a5b4fc]">
          <Rocket size={12} />
          Sẵn sàng vận hành ngay hôm nay
        </div>

        <h2 className="mx-auto mb-4 max-w-[480px] text-[32px] font-semibold leading-[1.15] tracking-[-0.025em] text-white md:text-[38px]">
          Bắt đầu quản lý{" "}
          <em className="not-italic text-[#a5b4fc]">fulfillment</em>
          <br />
          theo cách chuyên nghiệp
        </h2>

        <p className="mb-8 text-[15px] leading-relaxed text-[rgba(255,255,255,0.5)]">
          Đăng nhập để truy cập dashboard, quản lý đơn hàng và tích hợp carrier.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link className="lp-btn-primary" href="/login">
            <LogIn size={15} /> Đăng nhập ngay
          </Link>
          <button className="lp-btn-ghost" type="button">
            <BookOpen size={15} /> Xem tài liệu
          </button>
        </div>
      </div>
    </section>
  );
}
