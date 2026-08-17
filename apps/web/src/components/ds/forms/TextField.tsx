import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className"
> {
  label?: ReactNode;
  /** Terse mono note under the field: "Minimum 8 characters". */
  hint?: ReactNode;
  error?: boolean;
  /** Class for the wrapper, not the input. */
  className?: string;
}

export function TextField({
  label,
  hint,
  error = false,
  id,
  required,
  className,
  ...rest
}: TextFieldProps) {
  return (
    // `group` so the label can pick up the signal colour on focus without state.
    <div className={cn("group mb-5", className)}>
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
      <input
        id={id}
        required={required}
        aria-invalid={error || undefined}
        className={cn(
          "block w-full border bg-ink-950 px-3.5 py-3",
          "font-mono text-sm tracking-mono text-bone-100",
          "placeholder:text-mute-600 outline-hidden transition-fast",
          error
            ? "border-abort"
            : "border-line-hairline focus:border-signal focus:shadow-glow-focus",
        )}
        {...rest}
      />
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
