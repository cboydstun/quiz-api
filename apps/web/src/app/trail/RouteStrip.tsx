import { cn } from "@/components/ds";

export interface RouteStripProps {
  /** Total legs on today's route. */
  total: number;
  /** 0-based index of the leg being flown. */
  current: number;
  /** Which legs are hazards, by 0-based index. */
  hazards?: boolean[];
  className?: string;
}

/**
 * Where you are on the route, always visible while flying.
 *
 * Distinct from `QuestionCard`'s progress bar, which counts questions inside a
 * leg. This counts legs, and it is the only thing on the question screen that
 * answers "how much of this is left".
 *
 * The nodes are decorative; the strip carries the position as a label so it is
 * available without the picture.
 */
export function RouteStrip({
  total,
  current,
  hazards = [],
  className,
}: RouteStripProps) {
  // Legs are points, so the filled rail spans the gaps between them.
  const pct = total > 1 ? (current / (total - 1)) * 100 : 100;

  return (
    <div
      className={cn("relative", className)}
      role="group"
      aria-label={`Leg ${current + 1} of ${total}`}
    >
      <div className="relative flex items-center" aria-hidden>
        {/* The rail, and the part of it already flown. Width transitions on a
            token, so a crossing draws rather than jumps. */}
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink-600" />
        <span
          className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-signal transition-[width] duration-[var(--duration-base)] ease-default"
          style={{ width: `${pct}%` }}
        />

        <div className="relative flex w-full items-center justify-between">
          {Array.from({ length: total }, (_, i) => {
            const flown = i < current;
            const here = i === current;
            return (
              <span
                key={i}
                data-testid="route-node"
                data-state={here ? "current" : flown ? "flown" : "pending"}
                className={cn(
                  "h-2 w-2 transition-fast",
                  here
                    ? "bg-signal"
                    : flown
                      ? hazards[i]
                        ? "bg-abort"
                        : "bg-mute-600"
                      : "bg-ink-600",
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
