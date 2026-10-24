"use client";

import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon-md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-indigo-600 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:border-indigo-700 active:bg-indigo-800 focus:ring-indigo-500",
  secondary:
    "border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 focus:ring-slate-400",
  soft: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 focus:ring-indigo-500",
  ghost:
    "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 shadow-sm hover:bg-rose-100 active:bg-rose-200 focus:ring-rose-500",
  outline:
    "border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-400",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 rounded-md px-3 text-xs",
  md: "h-9 rounded-md px-4 text-xs font-medium",
  lg: "h-10 rounded-md px-5 text-sm font-medium",
  "icon-sm": "h-8 w-8 rounded-md p-0",
  "icon-md": "h-9 w-9 rounded-md p-0",
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
          "inline-flex shrink-0 items-center justify-center gap-1.5 border font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
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
          <Loader2 className="animate-spin" size={iconSize} />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  },
);

Button.displayName = "Button";
