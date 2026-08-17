import { cn } from "../cn";

export interface SpinnerProps {
  /** Pixel size of the rotating square. */
  size?: number;
  /** Centres the spinner in a 200px-tall well. */
  centered?: boolean;
  label?: string;
  className?: string;
}

/**
 * The one rotating element in the system: a hairline square with a signal top
 * edge, 800ms linear. Nothing else spins, pulses or bounces.
 */
export function Spinner({
  size = 40,
  centered = true,
  label = "Loading",
  className,
}: SpinnerProps) {
  const el = (
    <div role="status" className="flex items-center gap-4">
      <div
        aria-hidden="true"
        style={{ width: size, height: size }}
        className="animate-[spin_0.8s_linear_infinite] border border-line-hairline border-t-signal"
      />
      {label && <span className="label-mono text-mute-500">{label}</span>}
    </div>
  );

  if (!centered) return <div className={className}>{el}</div>;
  return (
    <div
      className={cn(
        "flex min-h-[200px] items-center justify-center",
        className,
      )}
    >
      {el}
    </div>
  );
}
