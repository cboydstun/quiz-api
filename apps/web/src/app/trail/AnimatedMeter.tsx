"use client";

import { useEffect, useState } from "react";
import { Meter, type MeterProps } from "@/components/ds";

export interface AnimatedMeterProps extends Omit<MeterProps, "value"> {
  /** Where the needle was before the last answer landed. */
  from: number;
  /** Where it is now. */
  to: number;
}

/**
 * A meter that arrives at its old value and then drains to the new one.
 *
 * `Meter`'s per-segment stagger is a CSS transition, and a transition needs a
 * change to animate. Mounting the verdict screen with the post-damage value
 * already in place gave it nothing to do, which is why the sweep was invisible
 * — the cost of a miss appeared as a number that had simply always been that.
 *
 * The move is scheduled in a `requestAnimationFrame` rather than called from
 * the effect body. That is not lint appeasement: setting state synchronously in
 * an effect can be batched into the same paint as the mount, and then there is
 * still no transition. The frame guarantees the browser paints `from` first.
 */
export function AnimatedMeter({ from, to, ...rest }: AnimatedMeterProps) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    setValue(from);
    if (from === to) return;

    const frame = requestAnimationFrame(() => setValue(to));
    return () => cancelAnimationFrame(frame);
  }, [from, to]);

  return <Meter {...rest} value={value} />;
}
