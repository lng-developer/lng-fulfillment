export function LandingFooter() {
  return (
    <footer className="flex flex-wrap items-center gap-4 border-t border-[var(--border)] bg-[var(--bg-surface2)] px-4 py-5 md:px-7">
      <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] bg-[var(--brand)] text-[8px] font-bold text-white">
          FP
        </div>
        Fulfillment Platform v2 · © {new Date().getFullYear()}
      </div>
      <div className="ml-auto flex gap-4">
        {["Điều khoản", "Bảo mật", "Liên hệ"].map((link) => (
          <span
            className="cursor-pointer text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
            key={link}
          >
            {link}
          </span>
        ))}
      </div>
    </footer>
  );
}
