import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export type ButtonVariant =
  "signal" | "primary" | "outline" | "ghost" | "go" | "caution" | "abort";

export type ButtonSize = "sm" | "md" | "lg";

// Hover is the whole feedback loop — the system has no separate press state.
const VARIANTS: Record<ButtonVariant, string> = {
  signal:
    "bg-signal text-ink-950 border-signal hover:bg-bone-100 hover:border-bone-100",
  primary:
    "bg-bone-100 text-ink-950 border-bone-100 hover:bg-signal hover:border-signal",
  outline:
    "bg-transparent text-bone-100 border-line-strong hover:border-signal hover:text-signal",
  ghost:
    "bg-transparent text-mute-400 border-transparent hover:bg-ink-600 hover:text-bone-100",
  go: "bg-transparent text-go border-go hover:bg-go-wash",
  caution: "bg-transparent text-caution border-caution hover:bg-caution-wash",
  abort: "bg-transparent text-abort border-abort hover:bg-abort-wash",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-2xs",
  md: "px-5 py-3 text-xs",
  lg: "px-8 py-[18px] text-sm",
};

/**
 * The button's classes on their own, for the cases where the control has to be
 * an anchor (a `next/link`) rather than a `<button>`. Never nest a Button
 * inside a Link — use this instead.
 */
export function buttonClass({
  variant = "outline",
  size = "md",
  fullWidth = false,
  selected = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  selected?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 border font-mono font-medium uppercase tracking-label whitespace-nowrap",
    "transition-fast focus-signal cursor-pointer",
    "disabled:opacity-35 disabled:cursor-not-allowed",
    SIZES[size],
    selected ? "bg-signal text-ink-950 border-signal" : VARIANTS[variant],
    fullWidth && "w-full",
    className,
  );
}

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  selected?: boolean;
  icon?: ReactNode;
  type?: "button" | "submit" | "reset";
  children?: ReactNode;
}

export function Button({
  variant = "outline",
  size = "md",
  fullWidth = false,
  selected = false,
  disabled = false,
  icon = null,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={buttonClass({ variant, size, fullWidth, selected, className })}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
