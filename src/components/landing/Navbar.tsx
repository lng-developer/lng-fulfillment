import { ArrowRight } from "lucide-react";
import Link from "next/link";

const links = [
  { href: "#features", label: "Tính năng" },
  { href: "#workflow", label: "Luồng làm việc" },
  { href: "#security", label: "Bảo mật" },
];

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex h-[54px] items-center border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 md:px-7">
      <Link
        className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]"
        href="/"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[var(--brand)] text-[11px] font-bold text-white">
          FP
        </span>
        Fulfillment
      </Link>

      <div className="mx-7 hidden gap-0.5 md:flex">
        {links.map((link) => (
          <a
            className="rounded-md px-3 py-1.5 text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--mist)] hover:text-[var(--text-primary)]"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </a>
        ))}
      </div>

      <div className="ml-auto flex gap-2">
        <Link
          className="rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface2)]"
          href="/login"
        >
          Đăng nhập
        </Link>
        <Link
          className="hidden items-center gap-1.5 rounded-[7px] border border-[var(--brand-dark)] bg-[var(--brand)] px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[var(--brand-dark)] sm:flex"
          href="/orders"
        >
          Vào dashboard <ArrowRight size={13} />
        </Link>
      </div>
    </nav>
  );
}
