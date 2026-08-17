import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "../cn";

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className"
> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: boolean;
  /** Class for the wrapper, not the select. */
  className?: string;
  /** Drops the wrapper margin, for selects sitting inside a table row. */
  bare?: boolean;
  children?: ReactNode;
}

/**
 * A native `<select>`, deliberately.
 *
 * The design system ships no Select — its inventory notes the product has none
 * — but the product does: the operator role dropdowns and the role filter.
 * This is the design's language applied to the native control rather than a
 * new pattern: square, hairline border, mono type, signal focus. Keeping it
 * native also keeps the platform's keyboard and mobile behaviour, and keeps
 * roles like `option` intact for assistive tech.
 */
export function Select({
  label,
  hint,
  error = false,
  id,
  required,
  className,
  bare = false,
  children,
  ...rest
}: SelectProps) {
  return (
    <div className={cn("group", !bare && "mb-5", className)}>
      {label && (
        // The required marker sits outside the <label> deliberately: keeping it
        // inside changes the label's text to "Username *", which breaks every
        // getByLabelText("Username") and, more importantly, makes a screen
        // reader announce the asterisk. The input's own `required` attribute
        // is what actually conveys the requirement.
        <div className="mb-2 flex items-center gap-1">
          <label
            htmlFor={id}
            className={cn(
              "label-mono transition-fast",
              error
                ? "text-abort"
                : "text-mute-500 group-focus-within:text-signal",
            )}
          >
            {label}
          </label>
          {required && (
            <span aria-hidden="true" className="text-signal">
              *
            </span>
          )}
        </div>
      )}
      <select
        id={id}
        required={required}
        aria-invalid={error || undefined}
        className={cn(
          "block w-full border bg-ink-950 px-3.5 py-3",
          "font-mono text-sm tracking-mono text-bone-100",
          "outline-hidden transition-fast",
          "disabled:cursor-not-allowed disabled:opacity-35",
          error
            ? "border-abort"
            : "border-line-hairline focus:border-signal focus:shadow-glow-focus",
        )}
        {...rest}
      >
        {children}
      </select>
      {hint && (
        <div
          className={cn(
            "mt-2 font-mono text-3xs uppercase tracking-label",
            error ? "text-abort" : "text-mute-500",
          )}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
