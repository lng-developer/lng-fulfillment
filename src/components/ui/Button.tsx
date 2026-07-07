"use client";

import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon-md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[var(--brand-dark)] bg-[var(--brand)] text-white shadow-[0_1px_2px_rgba(79,70,229,0.18),0_8px_18px_rgba(99,102,241,0.16)] hover:border-[var(--brand-dark)] hover:bg-[var(--brand-dark)] active:bg-[#4338ca]",
  secondary:
    "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[0_1px_2px_rgba(26,29,58,0.04)] hover:border-[var(--brand-mid)] hover:bg-[var(--bg-surface2)] hover:text-[var(--brand-dark)]",
  soft: "border-[var(--brand-mid)] bg-[var(--brand-light)] text-[var(--brand-dark)] hover:border-[var(--brand)] hover:bg-[#e0e7ff]",
  ghost:
    "border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface2)] hover:text-[var(--text-primary)]",
  danger:
    "border-red-200 bg-white text-[var(--danger)] shadow-[0_1px_2px_rgba(220,38,38,0.04)] hover:border-red-300 hover:bg-red-50 active:bg-red-100",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 rounded-[var(--r-sm)] px-3 text-xs",
  md: "h-10 rounded-[var(--r-sm)] px-4 text-xs",
  lg: "h-11 rounded-[var(--r)] px-5 text-sm",
  "icon-sm": "h-8 w-8 rounded-[8px] p-0",
  "icon-md": "h-10 w-10 rounded-[var(--r-sm)] p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      isLoading = false,
      leftIcon,
      rightIcon,
      size = "md",
      type = "button",
      variant = "secondary",
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;
    const iconSize = size === "lg" ? 16 : 14;

    return (
      <button
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-2 border font-semibold transition-[background,border-color,color,box-shadow,transform] duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:ring-offset-1 focus:ring-offset-[var(--bg-surface)] disabled:cursor-not-allowed disabled:opacity-55",
          "active:translate-y-px",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        disabled={isDisabled}
        ref={ref}
        type={type}
        {...props}
      >
        {isLoading ? (
          <Loader2
            aria-hidden
            className="animate-spin"
            size={iconSize}
            strokeWidth={2.2}
          />
        ) : (
          leftIcon
        )}
        {children}
        {rightIcon}
      </button>
    );
  },
);

Button.displayName = "Button";
