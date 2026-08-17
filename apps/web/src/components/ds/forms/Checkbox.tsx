import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
> {
  label: ReactNode;
  className?: string;
}

export function Checkbox({ id, label, className, ...rest }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn("inline-flex cursor-pointer items-center gap-3", className)}
    >
      <input
        id={id}
        type="checkbox"
        className={cn(
          "size-3.5 m-0 cursor-pointer appearance-none border border-line-strong bg-transparent",
          "checked:border-signal checked:bg-signal",
          "focus-visible:outline-hidden focus-visible:border-signal focus-visible:shadow-glow-focus",
          "transition-fast",
        )}
        {...rest}
      />
      <span className="font-mono text-3xs uppercase tracking-label text-mute-400">
        {label}
      </span>
    </label>
  );
}
