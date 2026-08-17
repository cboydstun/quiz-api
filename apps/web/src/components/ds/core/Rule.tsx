import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export type RuleTone = "hairline" | "strong" | "signal";

const TONES: Record<RuleTone, string> = {
  hairline: "bg-line-hairline",
  strong: "bg-line-strong",
  signal: "bg-signal",
};

export interface RuleProps extends HTMLAttributes<HTMLDivElement> {
  /** When given, the rule becomes a labelled section divider. */
  label?: ReactNode;
  tone?: RuleTone;
  children?: never;
}

export function Rule({
  label,
  tone = "hairline",
  className,
  ...rest
}: RuleProps) {
  if (!label) {
    return (
      <div className={cn("h-px w-full", TONES[tone], className)} {...rest} />
    );
  }
  return (
    <div className={cn("flex items-center gap-4", className)} {...rest}>
      <span className="label-mono whitespace-nowrap text-mute-500">
        {label}
      </span>
      <div className={cn("h-px flex-1", TONES[tone])} />
    </div>
  );
}
